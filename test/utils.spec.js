import { describe, it, expect } from "vitest";
import { substringBetween } from "../src/utils.js";

describe("substringBetween", () => {
	it.each([
		{
			case: "returns the substring",
			str: "<script>test</script>",
			start: "<script>",
			end: "</script>",
			expected: "test",
		},
		{
			case: "returns null when the start string is missing",
			str: "</script>test</script>",
			start: "<script>",
			end: "</script>",
			expected: null,
		},
		{
			case: "returns null when the end string is missing",
			str: "<script>test<script>",
			start: "<script>",
			end: "</script>",
			expected: null,
		},
	])("$case", ({ str, start, end, expected }) => {
		expect(substringBetween(str, start, end)).toBe(expected);
	});
});
