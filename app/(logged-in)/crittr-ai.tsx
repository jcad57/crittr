import CrittrAiAssistantTypingReveal from "@/components/crittr-ai/CrittrAiAssistantTypingReveal";
import { TypingBubble } from "@/components/screens/crittr-ai/TypingBubble";
import { Colors } from "@/constants/colors";
import { CRITTR_AI_WELCOME_ASSISTANT_TEXT } from "@/constants/crittrAiCopy";
import { useCrittrAiThreadQuery } from "@/hooks/queries";
import { crittrAiThreadKey } from "@/hooks/queries/queryKeys";
import { useProGateNavigation } from "@/hooks/useProGateNavigation";
import {
  type CrittrAiThread,
  deleteCrittrAiConversationsForUser,
  invokeCrittrAiChat,
} from "@/services/crittrAi";
import { useAuthStore } from "@/stores/authStore";
import type { CrittrAiMessage } from "@/types/database";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type Href, useRouter } from "expo-router";
import {
  type ComponentRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import {
  KeyboardAwareScrollView,
  useReanimatedKeyboardAnimation,
} from "react-native-keyboard-controller";
import Reanimated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { styles } from "@/screen-styles/crittr-ai.styles";

export default function CrittrAiScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user?.id);
  const { runWithProOrUpgrade } = useProGateNavigation();
  const scrollRef = useRef<ComponentRef<typeof KeyboardAwareScrollView>>(null);

  /** Avoid NaN in CoreGraphics when safe-area or keyboard progress is briefly non-finite. */
  const safeBottomInset = Number.isFinite(insets.bottom) ? insets.bottom : 0;

  const { progress, height: keyboardTranslateY } =
    useReanimatedKeyboardAnimation();

  const keyboardStickyStyle = useAnimatedStyle(() => {
    const y = keyboardTranslateY.value;
    return {
      transform: [{ translateY: Number.isFinite(y) ? y : 0 }],
    };
  });

  const composerAnimatedStyle = useAnimatedStyle(() => {
    const raw = progress.value;
    const p = Number.isFinite(raw) ? Math.min(1, Math.max(0, raw)) : 0;
    const closed = Math.max(safeBottomInset, 12) + 8;
    return {
      paddingBottom: interpolate(
        p,
        [0, 1],
        [closed, 10],
        Extrapolation.CLAMP,
      ),
    };
  }, [safeBottomInset]);

  /**
   * Only a small visual gap under the last bubble. The composer sits *below* this
   * `ScrollView` in the flex column (not overlaid), so we must NOT add “composer
   * height” here — that double-counted clearance and matched the large empty band.
   * `KeyboardAwareScrollView` already appends an animated spacer when the keyboard
   * is open (`paddingBottom: keyboardFrame + 1`).
   */
  const scrollContentBottomPadding = 16;

  const {
    data: thread,
    isPending: isThreadLoading,
    isError: threadError,
    refetch: refetchThread,
  } = useCrittrAiThreadQuery();

  const [input, setInput] = useState("");
  /** Shown immediately on send until the thread refetch replaces it with server rows. */
  const [optimisticUserText, setOptimisticUserText] = useState<string | null>(
    null,
  );
  /** Assistant bubble that should type out after a successful send (not historical load). */
  const [revealingAssistantMessageId, setRevealingAssistantMessageId] =
    useState<string | null>(null);
  const assistantIdsBeforeSendRef = useRef<Set<string>>(new Set());
  const expectRevealAfterSuccessRef = useRef(false);

  const mutation = useMutation({
    mutationFn: (message: string) => {
      const cached = userId
        ? queryClient.getQueryData<CrittrAiThread>(crittrAiThreadKey(userId))
        : undefined;
      return invokeCrittrAiChat({
        conversationId: cached?.conversationId ?? null,
        message,
      });
    },
    onMutate: () => {
      const cached = userId
        ? queryClient.getQueryData<CrittrAiThread>(crittrAiThreadKey(userId))
        : undefined;
      assistantIdsBeforeSendRef.current = new Set(
        (cached?.messages ?? [])
          .filter((m) => m.role === "assistant")
          .map((m) => m.id),
      );
    },
    onSuccess: () => {
      expectRevealAfterSuccessRef.current = true;
    },
    onSettled: async () => {
      if (userId) {
        await queryClient.invalidateQueries({
          queryKey: crittrAiThreadKey(userId),
        });
      }
      setOptimisticUserText(null);
    },
  });

  const messages = useMemo(() => thread?.messages ?? [], [thread]);
  const showWelcome = messages.length === 0 && !optimisticUserText;

  useEffect(() => {
    if (!expectRevealAfterSuccessRef.current) return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant") return;
    if (assistantIdsBeforeSendRef.current.has(last.id)) return;

    expectRevealAfterSuccessRef.current = false;
    setRevealingAssistantMessageId(last.id);
  }, [messages]);

  useEffect(() => {
    if (
      revealingAssistantMessageId &&
      !messages.some((m) => m.id === revealingAssistantMessageId)
    ) {
      setRevealingAssistantMessageId(null);
    }
  }, [messages, revealingAssistantMessageId]);

  const handleAssistantTypingComplete = useCallback(() => {
    setRevealingAssistantMessageId(null);
  }, []);
  const isBusy = mutation.isPending;
  const lastMsg = messages[messages.length - 1];
  const showOptimisticUser =
    optimisticUserText != null &&
    !(lastMsg?.role === "user" && lastMsg.content === optimisticUserText);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
  }, []);

  useEffect(() => {
    scrollToEnd();
  }, [
    messages.length,
    isBusy,
    optimisticUserText,
    showOptimisticUser,
    scrollToEnd,
  ]);

  const send = () => {
    void runWithProOrUpgrade(() => {
      void handleSend();
    });
  };

  const handleSend = async () => {
    const t = input.trim();
    if (!t || mutation.isPending) return;
    setOptimisticUserText(t);
    setInput("");
    try {
      await mutation.mutateAsync(t);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Please try again.";
      Alert.alert("Couldn’t get a reply", msg);
    }
  };

  const handleStartNewChat = () => {
    if (!userId || mutation.isPending) return;
    Alert.alert(
      "Start new chat?",
      "Your CrittrAI conversation history will be removed. This can’t be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => {
            void (async () => {
              try {
                expectRevealAfterSuccessRef.current = false;
                setRevealingAssistantMessageId(null);
                await deleteCrittrAiConversationsForUser(userId);
                setInput("");
                setOptimisticUserText(null);
                queryClient.setQueryData<CrittrAiThread>(
                  crittrAiThreadKey(userId),
                  { conversationId: null, messages: [] },
                );
                await queryClient.invalidateQueries({
                  queryKey: crittrAiThreadKey(userId),
                });
              } catch (e) {
                const msg =
                  e instanceof Error ? e.message : "Please try again.";
                Alert.alert("Couldn’t clear chat", msg);
              }
            })();
          },
        },
      ],
    );
  };

  const renderMessage = (msg: CrittrAiMessage) => (
    <View
      key={msg.id}
      style={[
        styles.bubble,
        msg.role === "user" ? styles.bubbleUser : styles.bubbleAssistant,
      ]}
    >
      {msg.role === "user" ? (
        <Text style={[styles.bubbleText, styles.bubbleTextUser]}>
          {msg.content}
        </Text>
      ) : (
        <CrittrAiAssistantTypingReveal
          markdown={msg.content}
          animate={revealingAssistantMessageId === msg.id}
          onTypingComplete={handleAssistantTypingComplete}
        />
      )}
    </View>
  );

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace("/(logged-in)/dashboard" as Href);
          }}
          hitSlop={12}
          style={styles.backHit}
        >
          <MaterialCommunityIcons
            name="chevron-left"
            size={28}
            color={Colors.textPrimary}
          />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          CrittrAI
        </Text>
        <Pressable
          onPress={handleStartNewChat}
          hitSlop={12}
          style={styles.headerTrailing}
          accessibilityRole="button"
          accessibilityLabel="Start new chat"
        >
          <MaterialCommunityIcons
            name="plus"
            size={28}
            color={Colors.textPrimary}
          />
        </Pressable>
      </View>

      <KeyboardAwareScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollInner,
          { paddingBottom: scrollContentBottomPadding },
        ]}
        bottomOffset={10}
        extraKeyboardSpace={0}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={scrollToEnd}
      >
        {threadError ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>
              Couldn’t load your chat history.
            </Text>
            <Pressable onPress={() => void refetchThread()} hitSlop={8}>
              <Text style={styles.errorRetry}>Tap to retry</Text>
            </Pressable>
          </View>
        ) : null}

        {showWelcome ? (
          <View
            style={[styles.bubble, styles.bubbleAssistant]}
            accessibilityRole="text"
          >
            <Text style={styles.bubbleText}>
              {CRITTR_AI_WELCOME_ASSISTANT_TEXT}
            </Text>
          </View>
        ) : null}

        {messages.map(renderMessage)}
        {showOptimisticUser ? (
          <View
            style={[styles.bubble, styles.bubbleUser]}
            accessibilityRole="text"
          >
            <Text style={[styles.bubbleText, styles.bubbleTextUser]}>
              {optimisticUserText}
            </Text>
          </View>
        ) : null}
        {isBusy ? <TypingBubble /> : null}
      </KeyboardAwareScrollView>

      <Reanimated.View style={keyboardStickyStyle}>
        <Reanimated.View style={[styles.composer, composerAnimatedStyle]}>
          <TextInput
            style={styles.input}
            placeholder="Ask about your pets…"
            placeholderTextColor={Colors.gray400}
            value={input}
            onChangeText={setInput}
            multiline
            scrollEnabled
            blurOnSubmit={false}
            textAlignVertical="top"
            returnKeyType="default"
            editable={!isBusy && (!isThreadLoading || !!threadError)}
          />
          <Pressable
            onPress={send}
            disabled={isBusy || !input.trim() || isThreadLoading}
            style={({ pressed }) => [
              styles.sendBtn,
              pressed && styles.sendBtnPressed,
              (isBusy || !input.trim() || isThreadLoading) &&
                styles.sendBtnDisabled,
            ]}
          >
            <MaterialCommunityIcons
              name="send"
              size={22}
              color={Colors.white}
            />
          </Pressable>
        </Reanimated.View>
      </Reanimated.View>
    </View>
  );
}
