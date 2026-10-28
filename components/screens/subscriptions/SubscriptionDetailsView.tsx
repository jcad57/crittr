import { styles } from "@/screen-styles/subscriptions.styles";
import { SubscriptionRow } from "@/components/screens/subscriptions/SubscriptionRow";
import type { SubscriptionDetails } from "@/services/iapSubscription";
import {
  formatSubscriptionDate as formatDate,
  formatStatus,
} from "@/utils/subscriptionDisplay";
import { Text, View } from "react-native";

function planMetaLine(sub: SubscriptionDetails): string {
  if (sub.isFamilyShared) return "Family Sharing";
  if (sub.isLifetime) return "Lifetime access";
  if (sub.isPromotional)
    return sub.currentPeriodEnd
      ? `Complimentary access until ${formatDate(sub.currentPeriodEnd)}`
      : "Complimentary access";
  if (sub.cancelAtPeriodEnd && sub.currentPeriodEnd) {
    return `Active until ${formatDate(sub.currentPeriodEnd)}`;
  }
  if (
    (sub.status === "active" || sub.status === "trialing") &&
    sub.currentPeriodEnd
  ) {
    const cadence = sub.planLabel === "annual" ? "Annual" : "Monthly";
    return `Renews ${formatDate(sub.currentPeriodEnd)} · ${cadence}`;
  }
  const cadence =
    sub.planLabel === "lifetime"
      ? "Lifetime"
      : sub.planLabel === "annual"
        ? "Annual"
        : "Monthly";
  return `${cadence} · ${formatStatus(sub.status)}`;
}

export function SubscriptionDetailsView({ sub }: { sub: SubscriptionDetails }) {
  const hideBillingDates = sub.isLifetime;

  return (
    <View style={styles.subscriptionMain}>
      <View style={styles.card}>
        <Text style={styles.planName}>Crittr Pro</Text>
        <Text style={styles.planMeta}>{planMetaLine(sub)}</Text>
        {sub.isLifetime ? null : (
          <Text style={styles.priceLine}>{sub.priceFormatted}</Text>
        )}
        {sub.storeLabel ? (
          <Text style={styles.subLine}>
            {sub.isPromotional ? "Granted via" : "Billed via"}: {sub.storeLabel}
          </Text>
        ) : null}
      </View>

      {hideBillingDates ? (
        <Text style={styles.footnote}>
          You have lifetime Crittr Pro access. There are no recurring charges
          for this access.
        </Text>
      ) : sub.isPromotional ? (
        <Text style={styles.footnote}>
          Your complimentary Crittr Pro access ends{" "}
          {formatDate(sub.currentPeriodEnd)}. This grant does not renew or
          charge you.
        </Text>
      ) : (
        <>
          <Text style={styles.sectionLabel}>Billing</Text>
          <View style={styles.card}>
            <SubscriptionRow
              label="Started"
              value={formatDate(sub.startedAt)}
            />
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
              label={
                sub.cancelAtPeriodEnd ? "Will not renew" : "Next billing date"
              }
              value={
                sub.cancelAtPeriodEnd
                  ? `Active until ${formatDate(sub.currentPeriodEnd)}`
                  : formatDate(sub.currentPeriodEnd)
              }
            />
          </View>
        </>
      )}

      {sub.cancelAtPeriodEnd && sub.currentPeriodEnd ? (
        <Text style={styles.footnote}>
          Your subscription will not renew. You keep Pro until{" "}
          {formatDate(sub.currentPeriodEnd)}.
        </Text>
      ) : null}

      {sub.isFamilyShared ? (
        <Text style={styles.footnote}>
          This Crittr Pro access was shared with you via Apple Family Sharing.
        </Text>
      ) : null}

      {sub.isPromotional && sub.managementUrl ? (
        <Text style={styles.footnote}>
          Complimentary access does not cancel an existing paid subscription.
          You can manage store billing below.
        </Text>
      ) : null}
    </View>
  );
}
