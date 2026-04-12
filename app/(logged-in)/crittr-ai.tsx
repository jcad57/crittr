import CrittrAiAssistantMarkdown from "@/components/crittr-ai/CrittrAiAssistantMarkdown";
import { Colors } from "@/constants/colors";
import { Font, MAIN_SCREEN_TITLE_SIZE } from "@/constants/typography";
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
  useRef,
  useState,
} from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  KeyboardAwareScrollView,
  useReanimatedKeyboardAnimation,
} from "react-native-keyboard-controller";
import Reanimated, {
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const WELCOME_ASSISTANT_TEXT =
  "Hi! I’m CrittrAI — ask me anything about your pet! \n\nTry asking 'How much should my dog eat?'";

/** iMessage-style composer: ~6 visible lines then scroll inside the field. */
const INPUT_LINE_HEIGHT = 22;
const INPUT_MAX_VISIBLE_LINES = 6;
const INPUT_MAX_HEIGHT = INPUT_LINE_HEIGHT * INPUT_MAX_VISIBLE_LINES + 20;

function TypingBubble() {
  const a0 = useSharedValue(0.35);
  const a1 = useSharedValue(0.35);
  const a2 = useSharedValue(0.35);

  useEffect(() => {
    const pulse = (v: SharedValue<number>, delayMs: number) => {
      v.value = withDelay(
        delayMs,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 360 }),
            withTiming(0.35, { duration: 360 }),
          ),
          -1,
          false,
        ),
      );
    };
    pulse(a0, 0);
    pulse(a1, 120);
    pulse(a2, 240);
  }, [a0, a1, a2]);

  const s0 = useAnimatedStyle(() => ({ opacity: a0.value }));
  const s1 = useAnimatedStyle(() => ({ opacity: a1.value }));
  const s2 = useAnimatedStyle(() => ({ opacity: a2.value }));

  return (
    <View
      style={[styles.bubble, styles.bubbleAssistant, styles.typingBubble]}
      accessibilityLabel="CrittrAI is typing"
      accessibilityRole="text"
    >
      <View style={styles.typingRow}>
        <Reanimated.View style={[styles.typingDot, s0]} />
        <Reanimated.View style={[styles.typingDot, s1]} />
        <Reanimated.View style={[styles.typingDot, s2]} />
      </View>
    </View>
  );
}

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
    onSettled: async () => {
      if (userId) {
        await queryClient.invalidateQueries({
          queryKey: crittrAiThreadKey(userId),
        });
      }
      setOptimisticUserText(null);
    },
  });

  const messages = thread?.messages ?? [];
  const showWelcome = messages.length === 0 && !optimisticUserText;
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
        <CrittrAiAssistantMarkdown markdown={msg.content} />
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
            <Text style={styles.bubbleText}>{WELCOME_ASSISTANT_TEXT}</Text>
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

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backHit: { width: 40, height: 40, justifyContent: "center" },
  title: {
    flex: 1,
    fontFamily: Font.displayBold,
    fontSize: MAIN_SCREEN_TITLE_SIZE,
    color: Colors.textPrimary,
    textAlign: "center",
  },
  headerTrailing: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: { flex: 1 },
  scrollInner: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 12,
  },
  betaPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: Colors.orangeLight,
    marginBottom: 8,
  },
  betaText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 12,
    color: Colors.orangeDark,
  },
  errorBanner: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: Colors.orangeLight,
    borderWidth: 1,
    borderColor: Colors.gray200,
    gap: 6,
  },
  errorBannerText: {
    fontFamily: Font.uiMedium,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  errorRetry: {
    fontFamily: Font.uiSemiBold,
    fontSize: 14,
    color: Colors.orangeDark,
  },
  bubble: {
    maxWidth: "92%",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  bubbleUser: {
    alignSelf: "flex-end",
    backgroundColor: Colors.orange,
  },
  bubbleAssistant: {
    alignSelf: "flex-start",
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.gray200,
    paddingBottom: 9,
  },
  typingBubble: {
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  typingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  typingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.gray400,
  },
  bubbleText: {
    fontFamily: Font.uiRegular,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textPrimary,
  },
  bubbleTextUser: {
    color: Colors.white,
  },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.gray200,
    backgroundColor: Colors.cream,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: INPUT_MAX_HEIGHT,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.gray200,
    backgroundColor: Colors.white,
    fontFamily: Font.uiRegular,
    fontSize: 16,
    lineHeight: INPUT_LINE_HEIGHT,
    color: Colors.textPrimary,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.orange,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnPressed: { opacity: 0.88 },
  sendBtnDisabled: { opacity: 0.45 },
});
