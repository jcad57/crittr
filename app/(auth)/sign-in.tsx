import StyledText from "@/components/text-components/StyledText";
import ScreenWrapper from "@/components/ui/ScreenWrapper";
import { Link } from "expo-router";

export default function SignIn() {
  return (
    <ScreenWrapper>
      <StyledText weight="bold">Sign In</StyledText>
      <Link href="/(auth)/welcome">Home</Link>
    </ScreenWrapper>
  );
}
