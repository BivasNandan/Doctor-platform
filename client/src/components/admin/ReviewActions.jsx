import { Check } from "lucide-react";
import { VERIFICATION_STATUS } from "../../constants.js";
import { Button } from "../ui/index.js";

export default function ReviewActions({ doctor, onDecide }) {
  const { PENDING, VERIFIED, REJECTED, SUSPENDED } = VERIFICATION_STATUS;
  switch (doctor.verificationStatus) {
    case PENDING:
      return (
        <>
          <Button variant="outline" onClick={() => onDecide(doctor, REJECTED)}>
            Request changes
          </Button>
          <Button onClick={() => onDecide(doctor, VERIFIED)}>
            <Check size={15} /> Approve
          </Button>
        </>
      );
    case VERIFIED:
      return (
        <Button variant="outline" onClick={() => onDecide(doctor, SUSPENDED)}>
          Suspend verification
        </Button>
      );
    case SUSPENDED:
      return <Button onClick={() => onDecide(doctor, VERIFIED)}>Restore verification</Button>;
    default:
      return (
        <Button variant="outline" onClick={() => onDecide(doctor, PENDING)}>
          Reopen review
        </Button>
      );
  }
}
