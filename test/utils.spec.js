import { describe, it, expect } from "vitest";
import * as utils from "../src/utils.js";

describe("substringBetween", () => {
	describe("valid cases", () => {
		it("returns the substring", () => {
			const result = utils.substringBetween("<script>test</script>", "<script>", "</script>");
			expect(result).toBe("test");
		});
	});

	describe("invalid cases", () => {
		it("returns null if the start string is not found", () => {
			const result = utils.substringBetween("</script>test</script>", "<script>", "</script>");
			expect(result).toBeNull();
		});

		it("returns null if the end string is not found", () => {
			const result = utils.substringBetween("<script>test<script>", "<script>", "</script>");
			expect(result).toBeNull();
		});
	});
});
