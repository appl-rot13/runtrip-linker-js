import { Buffer } from "node:buffer";

export function substringBetween(str, start, end) {
	const startIndex = str.indexOf(start);
	if (startIndex === -1) {
		return null;
	}

	const substrIndex = startIndex + start.length;
	const endIndex = str.indexOf(end, substrIndex);
	if (endIndex === -1) {
		return null;
	}

	return str.substring(substrIndex, endIndex);
}

export async function fetchImageAsBase64(url) {
	const image = await fetch(url);
	const buffer = await image.arrayBuffer();

	return Buffer.from(buffer).toString("base64");
}

export async function sha1(str) {
	const buffer = await crypto.subtle.digest(
		"SHA-1",
		new TextEncoder().encode(str),
	);

	return Buffer.from(buffer).toString("hex");
}
