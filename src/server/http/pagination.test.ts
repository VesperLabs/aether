import { describe, expect, it } from "vitest";
import { paginate, parsePageQuery } from "./pagination";

const items = Array.from({ length: 25 }, (_, i) => i);

describe("paginate", () => {
  it("reads page and pageSize from query strings", () => {
    const { data, pageInfo } = paginate(items, "2", "10", 10);
    expect(data).toEqual([10, 11, 12, 13, 14, 15, 16, 17, 18, 19]);
    expect(pageInfo).toEqual({
      nextPage: 3,
      hasNextPage: true,
      pageSize: 10,
      currentPage: 2,
      totalCount: 25,
    });
  });

  it("ends on the last page", () => {
    expect(paginate(items, "3", "10", 10).pageInfo).toMatchObject({
      nextPage: null,
      hasNextPage: false,
    });
  });

  it("falls back on missing or bad values", () => {
    expect(paginate(items, undefined, "abc", 5).data).toEqual([0, 1, 2, 3, 4]);
  });
});

describe("parsePageQuery", () => {
  it("turns query strings into numbers", () => {
    expect(parsePageQuery("3", "15", 20)).toEqual({ page: 3, pageSize: 15 });
    expect(parsePageQuery(undefined, "-1", 20)).toEqual({ page: 1, pageSize: 20 });
  });
});
