import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import { openBrowserAsync } from "expo-web-browser";
import { useCallback } from "react";
import { type StyleProp, View, type ViewStyle } from "react-native";
import {
  EnrichedMarkdownText,
  type MarkdownStyle,
} from "react-native-enriched-markdown";

/**
 * Tight block spacing + trailing margin stripped (allowTrailingMargin false)
 * so assistant bubbles don’t show a large gap under the last line.
 */
const assistantMarkdownStyle: MarkdownStyle = {
  paragraph: {
    fontFamily: Font.uiRegular,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textPrimary,
    marginTop: 0,
    marginBottom: 6,
  },
  h1: {
    fontFamily: Font.uiBold,
    fontSize: 22,
    lineHeight: 28,
    color: Colors.textPrimary,
    marginTop: 4,
    marginBottom: 8,
    fontWeight: "normal",
  },
  h2: {
    fontFamily: Font.uiBold,
    fontSize: 18,
    lineHeight: 24,
    color: Colors.textPrimary,
    marginTop: 4,
    marginBottom: 6,
    fontWeight: "normal",
  },
  h3: {
    fontFamily: Font.uiSemiBold,
    fontSize: 16,
    lineHeight: 22,
    color: Colors.textPrimary,
    marginTop: 2,
    marginBottom: 6,
    fontWeight: "normal",
  },
  h4: {
    fontFamily: Font.uiSemiBold,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textPrimary,
    marginTop: 2,
    marginBottom: 4,
    fontWeight: "normal",
  },
  h5: {
    fontFamily: Font.uiSemiBold,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textPrimary,
    marginTop: 2,
    marginBottom: 4,
    fontWeight: "normal",
  },
  h6: {
    fontFamily: Font.uiMedium,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.gray600,
    marginTop: 2,
    marginBottom: 4,
    fontWeight: "normal",
  },
  blockquote: {
    fontFamily: Font.uiRegular,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.gray700,
    marginTop: 0,
    marginBottom: 8,
    borderColor: Colors.gray300,
    backgroundColor: Colors.gray50,
  },
  list: {
    fontFamily: Font.uiRegular,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textPrimary,
    marginTop: 0,
    marginBottom: 6,
    bulletColor: Colors.textPrimary,
    markerColor: Colors.textPrimary,
    gapWidth: 8,
    marginLeft: 18,
  },
  codeBlock: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 0,
    marginBottom: 8,
    padding: 10,
    backgroundColor: Colors.gray800,
    borderColor: Colors.gray700,
    color: Colors.gray100,
  },
  link: {
    color: Colors.orangeDark,
    underline: true,
  },
  strong: {
    fontFamily: Font.uiSemiBold,
    fontWeight: "normal",
    color: Colors.textPrimary,
  },
  em: {
    fontStyle: "italic",
    color: Colors.textPrimary,
  },
  code: {
    fontSize: 13,
    color: Colors.orangeDark,
    backgroundColor: Colors.orangeLight,
    borderColor: Colors.gray200,
  },
  thematicBreak: {
    color: Colors.gray200,
    height: 1,
    marginTop: 10,
    marginBottom: 10,
  },
  table: {
    fontFamily: Font.uiRegular,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textPrimary,
    marginTop: 0,
    marginBottom: 8,
    borderColor: Colors.gray200,
    headerBackgroundColor: Colors.gray100,
    headerTextColor: Colors.textPrimary,
    rowEvenBackgroundColor: Colors.white,
    rowOddBackgroundColor: Colors.gray50,
  },
  image: {
    marginTop: 4,
    marginBottom: 6,
    borderRadius: 8,
    height: 180,
  },
};

type Props = {
  markdown: string;
  containerStyle?: StyleProp<ViewStyle>;
};

export default function CrittrAiAssistantMarkdown({
  markdown,
  containerStyle,
}: Props) {
  const onLinkPress = useCallback(({ url }: { url: string }) => {
    if (!url?.trim()) return;
    void openBrowserAsync(url).catch(() => undefined);
  }, []);

  const md = markdown.trim().length > 0 ? markdown : "_ ";

  return (
    <View style={containerStyle}>
      <EnrichedMarkdownText
        markdown={md}
        markdownStyle={assistantMarkdownStyle}
        containerStyle={{ alignSelf: "stretch" }}
        flavor="github"
        md4cFlags={{ underline: false, latexMath: false }}
        allowTrailingMargin={false}
        selectable
        onLinkPress={onLinkPress}
      />
    </View>
  );
}
