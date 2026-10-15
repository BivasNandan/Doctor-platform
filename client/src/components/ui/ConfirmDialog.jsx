import Button from "./Button.jsx";
import Modal from "./Modal.jsx";

export default function ConfirmDialog({
  title = "Are you sure?",
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}) {
  return (
    <Modal labelledBy="confirm-title" onClose={onCancel} className="confirm-dialog surface">
      <h2 id="confirm-title">{title}</h2>
      {message && <p>{message}</p>}
      <div className="form-actions">
        <Button variant="outline" onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button onClick={onConfirm}>{confirmLabel}</Button>
      </div>
    </Modal>
  );
}
