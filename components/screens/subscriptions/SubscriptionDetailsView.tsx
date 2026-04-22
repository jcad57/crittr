import { styles } from "@/screen-styles/subscriptions.styles";
import { SubscriptionRow } from "@/components/screens/subscriptions/SubscriptionRow";
import type { SubscriptionDetails } from "@/services/stripeSubscription";
import {
  formatSubscriptionDate as formatDate,
  formatStatus,
} from "@/utils/subscriptionDisplay";
import { Text, View } from "react-native";

export function SubscriptionDetailsView({ sub }: { sub: SubscriptionDetails }) {
  return (
    <View style={styles.subscriptionMain}>
      <View style={styles.card}>
        <Text style={styles.planName}>Crittr Pro</Text>
        <Text style={styles.planMeta}>
          {sub.planLabel === "annual" ? "Annual" : "Monthly"} ·{" "}
          {formatStatus(sub.status)}
        </Text>
        <Text style={styles.priceLine}>{sub.priceFormatted}</Text>
        {sub.paymentMethodLabel ? (
          <Text style={styles.subLine}>
            Card on file: {sub.paymentMethodLabel}
          </Text>
        ) : null}
      </View>

      <Text style={styles.sectionLabel}>Billing</Text>
      <View style={styles.card}>
        <SubscriptionRow label="Started" value={formatDate(sub.startedAt)} />
        <View style={styles.hairline} />
        <SubscriptionRow
          label="Current period"
          value={`${formatDate(sub.currentPeriodStart)} – ${formatDate(sub.currentPeriodEnd)}`}
        />
        {sub.status === "trialing" && sub.trialEnd ? (
          <>
            <View style={styles.hairline} />
            <SubscriptionRow
              label="Trial ends"
              value={formatDate(sub.trialEnd)}
            />
          </>
        ) : null}
        <View style={styles.hairline} />
        <SubscriptionRow
          label="Next billing date"
          value={
            sub.cancelAtPeriodEnd
              ? "No renewal (canceled)"
              : formatDate(sub.currentPeriodEnd)
          }
        />
        {sub.cancelAtPeriodEnd ? (
          <>
            <View style={styles.hairline} />
            <SubscriptionRow
              label="Access until"
              value={formatDate(sub.currentPeriodEnd)}
            />
          </>
        ) : null}
      </View>

      {sub.cancelAtPeriodEnd ? (
        <Text style={styles.footnote}>
          Your subscription will not renew. You keep Pro until{" "}
          {formatDate(sub.currentPeriodEnd)}.
        </Text>
      ) : null}
    </View>
  );
}
