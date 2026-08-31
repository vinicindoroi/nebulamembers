import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      toastOptions={{
        style: {
          background: "oklch(0.16 0.015 270 / 0.85)",
          backdropFilter: "blur(24px) saturate(1.4)",
          WebkitBackdropFilter: "blur(24px) saturate(1.4)",
          border: "1px solid oklch(1 0 0 / 0.1)",
          boxShadow: "0 16px 48px -8px rgba(0,0,0,0.6), inset 0 1px 0 oklch(1 0 0 / 0.05)",
          borderRadius: "16px",
          color: "oklch(0.95 0 0)",
        },
        classNames: {
          description: "!text-[oklch(0.7_0_0)]",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
