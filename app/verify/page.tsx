import AccountRecovery from "@/components/AccountRecovery";

// Funds and business verification use the authenticated dashboard service flows.
export default function VerifyPage() {
  return <AccountRecovery mode="verify"/>;
}
