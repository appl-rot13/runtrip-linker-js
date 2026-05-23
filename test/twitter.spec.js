import { describe, it, expect } from "vitest";
import { sanitizeHashtag, sanitizeTweetText } from "../src/twitter.js";

describe("sanitizeHashtag", () => {
	it.each([
		{
			case: "returns a hashtag when the input is in a valid format",
			input: "testテスト_123",
			expected: "#testテスト_123",
		},
		{
			case: "returns a hashtag with a single leading hash symbol",
			input: "#test",
			expected: "#test",
		},
		{
			case: "returns a hashtag with invalid chars removed",
			input: "t!e s🔥t\n",
			expected: "#test",
		},
		{
			case: "returns an empty string when the input has no letters",
			input: "_123!",
			expected: "",
		},
		{
			case: "returns an empty string when the input is empty",
			input: "",
			expected: "",
		},
	])("$case", ({ input, expected }) => {
		expect(sanitizeHashtag(input)).toBe(expected);
	});
});

describe("sanitizeTweetText", () => {
	it.each([
		{
			case: "returns the original string when no invalid chars exist",
			input: "testテスト",
			expected: "testテスト",
		},
		{
			case: "returns a string with invalid chars removed",
			input: "\uFFFEtest\uFEFFテスト\uFFFF",
			expected: "testテスト",
		},
		{
			case: "returns an empty string when the input is empty",
			input: "",
			expected: "",
		},
	])("$case", ({ input, expected }) => {
		expect(sanitizeTweetText(input)).toBe(expected);
	});
});
