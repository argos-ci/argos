import { describe, expect, it } from "vitest";

import { invariant } from "./invariant";

declare const maybeObject: { id: string } | null | undefined;
declare const anObject: { id: string };
declare const aString: string;
declare const aNumber: number;
declare const aBoolean: boolean;
declare const anUnknown: unknown;
declare const anAny: any;
declare const aFunction: () => void;

// Only type-checked: each call is its own function, as an invariant narrows
// its argument for the statements after it.
export const typeCases = [
  () => invariant(maybeObject, "can be null"),
  () => invariant(maybeObject, () => "lazy message", TypeError),
  () => invariant(aString, "can be empty"),
  () => invariant(aNumber, "can be 0"),
  () => invariant(aBoolean, "can be false"),
  () => invariant(anUnknown, "can be anything"),
  () => invariant(anAny, "can be anything"),
  () => invariant(aString.length > 0),
  // @ts-expect-error an object is never falsy
  () => invariant(anObject, "never fails"),
  // @ts-expect-error even without a message
  () => invariant(anObject),
  // @ts-expect-error a function is never falsy
  () => invariant(aFunction),
  // @ts-expect-error an array is never falsy
  () => invariant([anObject]),
];

describe("invariant", () => {
  it("passes on truthy values", () => {
    expect(() => invariant(1, "message")).not.toThrow();
  });

  it("throws with the message on falsy values", () => {
    expect(() => invariant(0, "zero")).toThrow("Invariant failed: zero");
    expect(() => invariant(null)).toThrow(/^Invariant failed$/);
    expect(() => invariant("", () => "lazy")).toThrow("Invariant failed: lazy");
  });

  it("throws the given error class", () => {
    expect(() => invariant(undefined, "typed", TypeError)).toThrow(TypeError);
  });
});
