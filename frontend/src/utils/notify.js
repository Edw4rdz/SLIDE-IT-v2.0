import { toast } from "react-hot-toast";

export const notify = (message, type = "info") => {
  if (type === "success") return toast.success(message);
  if (type === "error") return toast.error(message);
  return toast(message);
};

export const notifyLoginSuccess = (username) => {
  const name = username ? `, ${username}` : "";
  notify(`Welcome${name}! You are logged in.`, "success");
};

export const notifySignupSuccess = () => {
  notify("Account created successfully! Welcome to SLIDE-IT.", "success");
};

export const notifyEmailVerificationRequired = () => {
  notify("Please verify your email before logging in.", "error");
};
