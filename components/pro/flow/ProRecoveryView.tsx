import { Text, View } from "react-native";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { Colors } from "@/theme/colors";
import { ProIllustration, ProLink, ProNotice, ProOutlineButton, flowStyles } from "./ProFlowUi";

export function ProRecoveryView({ pending = false, confirmed = false, uncertain = false, nativeRequestPending = false, purchaseFailed = false, message, busy = false, onRetry, onRestore, onExit, onChangePlan }: {
  pending?: boolean; confirmed?: boolean; uncertain?: boolean; nativeRequestPending?: boolean; purchaseFailed?: boolean; message: string | null; busy?: boolean;
  onRetry: () => void; onRestore: () => void; onExit: () => void; onChangePlan?: () => void;
}) {
  return <View style={{ flex: 1, justifyContent: "center", paddingBottom: 24, gap: 20 }}>
    <ProIllustration kind={pending ? "pending" : "receipt"} color={pending ? Colors.lavenderLight : Colors.skyLight} height={uncertain ? 170 : 220} />
    <View>
      <Text style={[flowStyles.title, flowStyles.center]}>{uncertain ? "Let’s check your\npurchase status." : pending ? "Your payment\nis pending." : confirmed ? "Let’s finish\ngetting Pro ready." : purchaseFailed ? "Let’s try that\nagain." : "Let’s get you\nback to Pro."}</Text>
      <Text style={[flowStyles.subtitle, flowStyles.center]}>{uncertain ? "The store hasn’t confirmed whether checkout finished. Check access before trying another purchase." : pending ? "The store is still processing your payment. We’ll unlock Pro once it is confirmed." : confirmed ? "Your purchase is saved. We just need to confirm your access." : purchaseFailed ? "We couldn’t finish checking out. Review the message below, then try again." : "Already subscribed? Restore with the store account used to purchase."}</Text>
    </View>
    {message ? <ProNotice title={uncertain ? "Waiting for the store" : pending ? "Payment status" : confirmed ? "Your purchase is safe" : purchaseFailed ? "Checkout needs another try" : "We couldn’t verify access"} message={message} tone={pending || confirmed || uncertain ? "info" : "error"} /> : null}
    <View style={{ gap: 12 }}>
      <OrangeButton onPress={pending || confirmed || uncertain || purchaseFailed ? onRetry : onRestore} loading={busy}>{uncertain ? "Check purchase status" : pending ? "Check status" : confirmed ? "Retry activation" : purchaseFailed ? "Try again" : "Restore purchases"}</OrangeButton>
      {uncertain && !nativeRequestPending ? <ProOutlineButton onPress={onRestore} disabled={busy}>Restore purchases</ProOutlineButton> : null}
      {!pending && !confirmed && !uncertain && message ? <ProOutlineButton onPress={purchaseFailed ? onRestore : onRetry} disabled={busy}>{purchaseFailed ? "Restore purchases" : "Try again"}</ProOutlineButton> : null}
      {pending ? <ProOutlineButton onPress={onExit}>Back to Crittr</ProOutlineButton> : <ProLink onPress={onExit}>Back to Crittr</ProLink>}
      {!pending && onChangePlan && !confirmed && !uncertain ? <ProLink onPress={onChangePlan} disabled={busy}>Review plans</ProLink> : null}
    </View>
    {pending || confirmed || uncertain ? <ProNotice message={uncertain ? "Checking status won’t start another purchase." : "Checking access won’t charge you again."} tone="info" /> : null}
  </View>;
}
