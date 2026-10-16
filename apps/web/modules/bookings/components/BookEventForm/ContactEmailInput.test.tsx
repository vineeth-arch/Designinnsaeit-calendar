import * as DialogPrimitive from "@radix-ui/react-dialog";
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { ContactEmailInput } from "./ContactEmailInput";

vi.mock("@calcom/lib/hooks/useLocale", () => ({ useLocale: () => ({ t: (key: string) => key }) }));

// jsdom does not implement scrollIntoView.
Element.prototype.scrollIntoView = vi.fn();

const contacts = [
  { email: "alice@example.com", name: "Alice Smith" },
  { email: "bob@example.com", name: "Bob Jones" },
];

function Harness({
  onOpenChange,
  onSubmit,
}: {
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
}) {
  const [value, setValue] = useState("");
  return (
    <DialogPrimitive.Root open onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Content aria-describedby={undefined}>
          <DialogPrimitive.Title>Book</DialogPrimitive.Title>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSubmit();
            }}>
            <ContactEmailInput
              id="email"
              name="email"
              value={value}
              onChange={setValue}
              contacts={contacts}
              needsGoogleConsent={false}
            />
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

describe("ContactEmailInput inside a modal dialog", () => {
  it("picks a suggestion by click without closing the dialog", () => {
    const onOpenChange = vi.fn();
    render(<Harness onOpenChange={onOpenChange} onSubmit={vi.fn()} />);
    const input = screen.getByRole("combobox");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "ali" } });
    const option = screen.getByRole("option");
    fireEvent.mouseDown(option);
    fireEvent.click(option);
    expect(input).toHaveValue("alice@example.com");
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("Enter picks the active suggestion instead of submitting", () => {
    const onSubmit = vi.fn();
    render(<Harness onOpenChange={vi.fn()} onSubmit={onSubmit} />);
    const input = screen.getByRole("combobox");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "b" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(input).toHaveValue("bob@example.com");
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
