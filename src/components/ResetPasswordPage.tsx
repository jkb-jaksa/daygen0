import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import ResetPasswordModal from "./ResetPasswordModal";
import { layout, text } from "../styles/designSystem";
import { AUTH_ENTRY_PATH } from "../utils/navigation";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      setResetToken(token);
      setShowModal(true);
    } else {
      // If no token, redirect to home
      navigate("/", { replace: true });
    }
  }, [searchParams, navigate]);

  const handleSuccess = () => {
    setShowModal(false);
    navigate(AUTH_ENTRY_PATH, { replace: true });
  };

  const handleClose = () => {
    setShowModal(false);
    navigate("/", { replace: true });
  };

  if (!resetToken) {
    return (
      <div className={`${layout.page} flex items-center justify-center min-h-screen`}>
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-theme-white/40 border-t-theme-white mx-auto mb-4" />
          <p className={text.body}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${layout.page} flex items-center justify-center min-h-screen`}>
      <ResetPasswordModal
        open={showModal}
        onClose={handleClose}
        onSuccess={handleSuccess}
        resetToken={resetToken}
      />
    </div>
  );
}
