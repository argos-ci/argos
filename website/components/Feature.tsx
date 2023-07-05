import clsx from "clsx";

export const FeatureList: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => <div className="flex flex-col md:flex-row gap-8">{children}</div>;

export const Feature: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => <div className="flex flex-col gap-4 text-center">{children}</div>;

type IconColor = "primary" | "orange" | "green";

const iconColors: Record<IconColor, string> = {
  primary: "text-primary-300 bg-primary-900/50",
  orange: "text-orange-300 bg-orange-900/50",
  green: "text-green-300 bg-green-900/50",
};

export const FeatureIcon: React.FC<{
  icon: React.ComponentType<{ className?: string }>;
  color: "primary" | "orange" | "green";
}> = ({ icon: Icon, color }) => (
  <div
    className={clsx(
      "rounded-full w-10 h-10 flex items-center justify-center mx-auto",
      iconColors[color]
    )}
  >
    <Icon className="w-6 h-6" />
  </div>
);

export const FeatureTitle: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => <div className="font-semibold">{children}</div>;

export const FeatureText: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => <div className="text-on-light text-xl">{children}</div>;
