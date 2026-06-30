import classNames from "@calcom/ui/classNames";

export function Logo({
  small,
  icon,
  inline = true,
  className,
  src = "/api/logo",
}: {
  small?: boolean;
  icon?: boolean;
  inline?: boolean;
  className?: string;
  src?: string;
}) {
  // When using the default brand logo, swap the wordmark per theme (WORD MARK 2 on light,
  // WORD MARK 3 on dark) via CSS so there's no hydration flash. A custom `src` (e.g. an org
  // logo) keeps the original single-image behavior.
  const isDefault = src === "/api/logo";
  return (
    <h3 className={classNames("logo", inline && "inline", className)}>
      <strong>
        {icon ? (
          <img
            className="mx-auto w-9"
            alt="Design Innsæit"
            title="Design Innsæit"
            src={isDefault ? "/favicon.svg" : `${src}?type=icon`}
          />
        ) : isDefault ? (
          <>
            <img
              className={classNames(small ? "h-4 w-auto" : "h-5 w-auto", "block dark:hidden")}
              alt="Design Innsæit"
              title="Design Innsæit"
              src="/WORD-MARK-2.svg"
            />
            <img
              className={classNames(small ? "h-4 w-auto" : "h-5 w-auto", "hidden dark:block")}
              alt="Design Innsæit"
              title="Design Innsæit"
              src="/WORD-MARK-3.svg"
            />
          </>
        ) : (
          <img
            className={classNames(small ? "h-4 w-auto" : "h-5 w-auto", "dark:invert")}
            alt="Design Innsæit"
            title="Design Innsæit"
            src={src}
          />
        )}
      </strong>
    </h3>
  );
}
