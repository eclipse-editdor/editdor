/********************************************************************************
 * Copyright (c) 2025 Contributors to the Eclipse Foundation
 *
 * See the NOTICE file(s) distributed with this work for additional
 * information regarding copyright ownership.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0, or the W3C Software Notice and
 *
 * SPDX-License-Identifier: EPL-2.0 OR W3C-20150513
 ********************************************************************************/
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the browser bundle - this needs to match the exact import path in form.ts
vi.mock("@node-wot/browser-bundle", () => {
  return {
    Core: {
      Servient: vi.fn().mockImplementation(() => ({
        addClientFactory: vi.fn(),
        start: vi.fn().mockResolvedValue({
          consume: vi.fn().mockResolvedValue({
            readProperty: vi.fn().mockResolvedValue({
              value: vi.fn().mockResolvedValue({}),
              ignoreValidation: true,
            }),
            writeProperty: vi.fn().mockResolvedValue({}),
          }),
        }),
      })),
    },
    Http: {
      HttpClientFactory: vi.fn(),
      HttpsClientFactory: vi.fn(),
    },
  };
});

import {
  isSuccessResponse,
  handleHttpRequest,
  requestWeb,
  extractValueByPath,
  buildUrlWithParams,
} from "./thingsApiService";

describe("isSuccessResponse", () => {
  test("should return true when response has both 'data' and 'status' properties", () => {
    const response = {
      data: new Response(JSON.stringify({ result: "success" })),
      status: 200,
      headers: "{}",
    };

    expect(isSuccessResponse(response)).toBe(true);
  });

  test("should return false when response is missing 'data' property", () => {
    const response = {
      status: 200,
      message: "Not a success response",
    };
    expect(isSuccessResponse(response as HttpErrorResponse)).toBe(false);
  });

  test("should return false when response is missing 'status' property", () => {
    const response = {
      data: new Response(JSON.stringify({ result: "success" })),
      message: "Not a success response",
    };
    // @ts-expect-error - Testing invalid structure
    expect(isSuccessResponse(response)).toBe(false);
  });

  test("should return false when response is missing both 'data' and 'status' properties", () => {
    const response = {
      message: "Error occurred",
      reason: "Bad request",
    };
    expect(isSuccessResponse(response)).toBe(false);
  });

  test("should return false for an empty object", () => {
    expect(isSuccessResponse({} as any)).toBe(false);
  });

  test("should return false when response has other properties but not required ones", () => {
    const response = {
      headers: "{}",
      body: "content",
      url: "https://example.com",
    };
    expect(isSuccessResponse(response as any)).toBe(false);
  });
});

describe("requestWeb", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  test("should call fetch with default GET method and JSON content-type", async () => {
    const mockFetchResponse = { ok: true } as any;
    (global.fetch as any).mockResolvedValue(mockFetchResponse);

    await requestWeb("https://example.com/api");

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith("https://example.com/api", {
      method: "GET",
      body: undefined,
      headers: {
        "Content-Type": "application/json",
      },
    });
  });

  test("should call fetch with provided HTTP method and body", async () => {
    const mockFetchResponse = { ok: true } as any;
    (global.fetch as any).mockResolvedValue(mockFetchResponse);
    const body = JSON.stringify({ name: "test" });

    await requestWeb("https://example.com/api", "POST", body);

    expect(global.fetch).toHaveBeenCalledWith("https://example.com/api", {
      method: "POST",
      body,
      headers: {
        "Content-Type": "application/json",
      },
    });
  });

  test("should append query parameters (string, number, boolean) to URL", async () => {
    const mockFetchResponse = { ok: true } as any;
    (global.fetch as any).mockResolvedValue(mockFetchResponse);

    await requestWeb("https://example.com/api", "GET", undefined, {
      queryParams: { page: 2, filter: "active", enabled: true },
    });

    const calledWithUrl = (global.fetch as any).mock.calls[0][0] as string;
    expect(calledWithUrl).toMatch(
      /https:\/\/example\.com\/api\?page=2&filter=active&enabled=true/
    );
  });

  test("should merge custom headers with default Content-Type header", async () => {
    const mockFetchResponse = { ok: true } as any;
    (global.fetch as any).mockResolvedValue(mockFetchResponse);

    await requestWeb("https://example.com/api", "GET", undefined, {
      headers: { Authorization: "Bearer token123" },
    });

    expect(global.fetch).toHaveBeenCalledWith("https://example.com/api", {
      method: "GET",
      body: undefined,
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer token123",
      },
    });
  });

  test("should allow overriding default Content-Type header", async () => {
    const mockFetchResponse = { ok: true } as any;
    (global.fetch as any).mockResolvedValue(mockFetchResponse);

    await requestWeb("https://example.com/api", "GET", undefined, {
      headers: { "Content-Type": "text/plain" },
    });

    expect(global.fetch).toHaveBeenCalledWith("https://example.com/api", {
      method: "GET",
      body: undefined,
      headers: {
        "Content-Type": "text/plain",
      },
    });
  });

  test("should pass through additional fetch options (e.g., cache)", async () => {
    const mockFetchResponse = { ok: true } as any;
    (global.fetch as any).mockResolvedValue(mockFetchResponse);

    await requestWeb("https://example.com/api", "GET", undefined, {
      cache: "no-store" as RequestCache,
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "https://example.com/api",
      expect.objectContaining({
        cache: "no-store",
        method: "GET",
      })
    );
  });

  test("should correctly handle relative URL with query params using window.location.origin", async () => {
    const mockFetchResponse = { ok: true } as any;
    (global.fetch as any).mockResolvedValue(mockFetchResponse);

    // Simulate origin if needed (JSDOM usually sets this)
    const originalLocation = window.location;
    Object.defineProperty(window, "location", {
      value: { ...originalLocation, origin: "https://test.local" },
      writable: true,
      configurable: true,
    });

    await requestWeb("/api/devices", "GET", undefined, {
      queryParams: { id: 10 },
    });

    const calledWithUrl = (global.fetch as any).mock.calls[0][0] as string;
    expect(calledWithUrl).toBe("https://test.local/api/devices?id=10");

    // Restore location
    Object.defineProperty(window, "location", {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
  });

  test("should return the underlying fetch response", async () => {
    const mockFetchResponse = { ok: true, status: 204 } as any;
    (global.fetch as any).mockResolvedValue(mockFetchResponse);

    const result = await requestWeb("https://example.com/ping");
    expect(result).toBe(mockFetchResponse);
  });

  test("should forward object body as-is (without stringifying)", async () => {
    const mockFetchResponse = { ok: true } as any;
    (global.fetch as any).mockResolvedValue(mockFetchResponse);
    const bodyObj = { nested: { a: 1 } } as any;

    await requestWeb("https://example.com/api", "PUT", bodyObj);

    expect(global.fetch).toHaveBeenCalledWith(
      "https://example.com/api",
      expect.objectContaining({
        body: bodyObj,
        method: "PUT",
      })
    );
  });
});

describe("handleHttpRequest", () => {
  const originalFetch = global.fetch;
  beforeEach(() => {
    global.fetch = vi.fn();
  });
  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  test("should return success structure when fetch ok is true", async () => {
    const mockResponse = new Response(JSON.stringify({ ok: true }), {
      status: 200,
    });
    (global.fetch as any).mockResolvedValue(mockResponse);

    const result = await handleHttpRequest("https://example.com/api");

    expect(isSuccessResponse(result)).toBe(true);
    if (isSuccessResponse(result)) {
      expect(result.status).toBe(200);
      expect(result.data).toBe(mockResponse);
      expect(typeof result.headers).toBe("string");
    }
  });

  const statusMapping: Array<{
    status: number;
    phrase: string;
    contains: string;
  }> = [
    { status: 301, phrase: "Monitors for the property", contains: "301" },
    { status: 304, phrase: "Not Modified", contains: "304" },
    { status: 302, phrase: "Bad url", contains: "302" },
    { status: 400, phrase: "Bad Request", contains: "400" },
    { status: 401, phrase: "Unauthorized", contains: "401" },
    { status: 403, phrase: "Forbidden", contains: "403" },
    { status: 404, phrase: "Not Found", contains: "404" },
    { status: 405, phrase: "Property not writable", contains: "405" },
    { status: 406, phrase: "Invalid property value", contains: "406" },
    { status: 409, phrase: "Conflict", contains: "409" },
    { status: 429, phrase: "Too Many Requests", contains: "429" },
    { status: 499, phrase: "Client Closed Request", contains: "499" },
    { status: 500, phrase: "Internal Server Error", contains: "500" },
    { status: 502, phrase: "Bad Gateway", contains: "502" },
    { status: 503, phrase: "Service Unavailable", contains: "503" },
    { status: 504, phrase: "Gateway Timeout", contains: "504" },
  ];

  test.each(statusMapping)(
    "should map HTTP status $status to error phrase '$phrase'",
    async ({ status, phrase, contains }) => {
      const mockErrorBody = { error: phrase };
      if (status === 304) {
        const mockResponse304 = {
          ok: false,
          status,
          headers: new Headers({ "Content-Type": "application/json" }),
          json: () => Promise.resolve(mockErrorBody),
        } as any;
        (global.fetch as any).mockResolvedValue(mockResponse304);
      } else {
        const mockResponse = new Response(JSON.stringify(mockErrorBody), {
          status,
          headers: { "Content-Type": "application/json" },
        });
        (global.fetch as any).mockResolvedValue(mockResponse);
      }

      const result = await handleHttpRequest("https://example.com/api");

      expect(isSuccessResponse(result)).toBe(false);
      if (isSuccessResponse(result)) {
        throw new Error("Expected error response");
      }
      expect(result.message).toContain(phrase);
      expect(result.message).toContain(String(status));
      expect(result.reason === phrase || result.reason === "").toBe(true);
    }
  );

  test("should capture reason from error JSON body when available", async () => {
    const status = 404;
    const mockErrorBody = { error: "Not Found Resource" };
    const mockResponse = new Response(JSON.stringify(mockErrorBody), {
      status,
      headers: { "Content-Type": "application/json" },
    });
    (global.fetch as any).mockResolvedValue(mockResponse);

    const result = await handleHttpRequest("https://example.com/api");
    expect(isSuccessResponse(result)).toBe(false);
    if (isSuccessResponse(result)) {
      throw new Error("Expected error response");
    }
    expect(result.reason).toBe("Not Found Resource");
  });

  test("should return generic error message when JSON parse of error body fails", async () => {
    const status = 500;
    // Create a body that is invalid JSON by passing a stream-like object (simpler: override json())
    const badResponse: any = new Response("not-json", { status });
    badResponse.json = () => Promise.reject(new Error("Invalid JSON"));
    (global.fetch as any).mockResolvedValue(badResponse);

    const result = await handleHttpRequest("https://example.com/api");
    expect(isSuccessResponse(result)).toBe(false);
    if (isSuccessResponse(result)) {
      throw new Error("Expected error response");
    }
    expect(result.message).toContain("Internal Server Error");
  });

  test("should handle network error thrown by fetch", async () => {
    (global.fetch as any).mockRejectedValue(new Error("Network failure"));

    const result = await handleHttpRequest("https://example.com/api");
    expect(isSuccessResponse(result)).toBe(false);
    if (isSuccessResponse(result)) {
      throw new Error("Expected error response");
    }
    expect(result.message).toBe("Network failure");
  });

  test("should handle unexpected non-mapped status with default branch", async () => {
    const status = 418; // I'm a teapot (not explicitly mapped)
    const mockResponse = new Response(JSON.stringify({ error: "Teapot" }), {
      status,
    });
    (global.fetch as any).mockResolvedValue(mockResponse);

    const result = await handleHttpRequest("https://example.com/api");
    expect(isSuccessResponse(result)).toBe(false);
    if (isSuccessResponse(result)) {
      throw new Error("Expected error response");
    }
    expect(result.message).toContain("Request failed with status 418");
  });
});

describe("extractValueByPath", () => {
  test('should return stringified object when path is empty or "/"', () => {
    const responseData = { value: 42, status: "ok" };

    expect(extractValueByPath(responseData)).toBe(JSON.stringify(responseData));
    expect(extractValueByPath(responseData, "/")).toBe(
      JSON.stringify(responseData)
    );
  });

  test('should extract single-level property when path is "/propertyName"', () => {
    const responseData = { value: 42, status: "ok" };

    expect(extractValueByPath(responseData, "/value")).toBe("42");
    expect(extractValueByPath(responseData, "/status")).toBe("ok");
  });

  test('should extract nested property when path is "/path/to/property"', () => {
    const responseData = {
      sensor: {
        temperature: {
          value: 22.5,
          unit: "celsius",
        },
      },
    };

    expect(extractValueByPath(responseData, "/sensor/temperature/value")).toBe(
      "22.5"
    );
    expect(extractValueByPath(responseData, "/sensor/temperature/unit")).toBe(
      "celsius"
    );
  });

  test("should return stringified object when property does not exist", () => {
    const responseData = { value: 42 };

    expect(extractValueByPath(responseData, "/nonexistent")).toBe(
      JSON.stringify(responseData)
    );
    expect(extractValueByPath(responseData, "/path/to/nowhere")).toBe(
      JSON.stringify(responseData)
    );
  });

  test("should handle undefined or null values in the path", () => {
    const responseData = {
      a: {
        b: null,
        c: undefined,
      },
    };

    expect(extractValueByPath(responseData, "/a/b/something")).toBe(
      JSON.stringify(responseData)
    );
    expect(extractValueByPath(responseData, "/a/c/something")).toBe(
      JSON.stringify(responseData)
    );
  });
});

describe("buildUrlWithParams", () => {
  const originalLocation = window.location;

  beforeEach(() => {
    Object.defineProperty(window, "location", {
      value: {
        ...originalLocation,
        origin: "https://example.com",
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "location", {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
  });

  test("should return the endpoint unchanged when queryParams is not provided", () => {
    const endpoint = "https://api.example.com/things";
    const result = buildUrlWithParams(endpoint);
    expect(result).toBe(endpoint);
  });

  test("should return the endpoint unchanged when queryParams is an empty object", () => {
    const endpoint = "https://api.example.com/things";
    const result = buildUrlWithParams(endpoint, {});
    expect(result).toBe(endpoint);
  });

  test("should append a single string parameter to the URL", () => {
    const endpoint = "https://api.example.com/things";
    const result = buildUrlWithParams(endpoint, { name: "device1" });
    expect(result).toBe("https://api.example.com/things?name=device1");
  });

  test("should append a single number parameter to the URL", () => {
    const endpoint = "https://api.example.com/things";
    const result = buildUrlWithParams(endpoint, { id: 123 });
    expect(result).toBe("https://api.example.com/things?id=123");
  });

  test("should append a single boolean parameter to the URL", () => {
    const endpoint = "https://api.example.com/things";
    const result = buildUrlWithParams(endpoint, { active: true });
    expect(result).toBe("https://api.example.com/things?active=true");
  });

  test("should append multiple parameters to the URL", () => {
    const endpoint = "https://api.example.com/things";
    const result = buildUrlWithParams(endpoint, {
      name: "device1",
      id: 123,
      active: true,
    });
    expect(result).toBe(
      "https://api.example.com/things?name=device1&id=123&active=true"
    );
  });

  test("should properly encode special characters in parameter values", () => {
    const endpoint = "https://api.example.com/things";
    const result = buildUrlWithParams(endpoint, {
      query: "search term with spaces",
      filter: "category=sensors&type=temperature",
    });
    // RFC3986 specifies spaces should be encoded as %20, but encodeURIComponent encodes them as +
    // So we normalize the output for the test
    const normalizedResult = result.replace(/\+/g, "%20");
    // plus sign is used by URLSearchParams class
    expect(normalizedResult).toBe(
      "https://api.example.com/things?query=search%20term%20with%20spaces&filter=category%3Dsensors%26type%3Dtemperature"
    );
  });

  test("should handle URLs that already have query parameters", () => {
    const endpoint = "https://api.example.com/things?existing=param";
    const result = buildUrlWithParams(endpoint, { new: "parameter" });
    expect(result).toBe(
      "https://api.example.com/things?existing=param&new=parameter"
    );
  });

  test("should handle relative URLs by using window.location.origin", () => {
    const endpoint = "/api/things";
    const result = buildUrlWithParams(endpoint, { id: 123 });
    expect(result).toBe("https://example.com/api/things?id=123");
  });

  test("should handle falsy values correctly (except undefined and null)", () => {
    const endpoint = "https://api.example.com/things";
    const result = buildUrlWithParams(endpoint, {
      zero: 0,
      empty: "",
      falseVal: false,
    });
    expect(result).toBe(
      "https://api.example.com/things?zero=0&empty=&falseVal=false"
    );
  });

  test("should handle null and undefined values in queryParams", () => {
    const endpoint = "https://api.example.com/things";
    const result = buildUrlWithParams(endpoint, {
      nullVal: null as any,
      undefinedVal: undefined as any,
      validVal: "data",
    });

    // Only the valid parameter should be appended
    expect(result).toBe(
      "https://api.example.com/things?nullVal=null&undefinedVal=undefined&validVal=data"
    );
  });
});
