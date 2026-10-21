import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useResource } from "./useResource.js";

/** A loader whose answers are released by hand, so a test decides which one comes back first. */
function controlledLoader() {
  const calls = [];
  const loader = () =>
    new Promise((resolve) => {
      calls.push(resolve);
    });
  return { loader, calls };
}

describe("useResource quiet refresh", () => {
  it("loads once, then refresh() replaces the data without showing a loading state", async () => {
    let value = 1;
    const { result } = renderHook(() => useResource(async () => value, []));
    await waitFor(() => expect(result.current.data).toBe(1));

    value = 2;
    await act(() => result.current.refresh());
    expect(result.current.data).toBe(2);
    expect(result.current.loading).toBe(false);
  });

  it("ignores an older answer that arrives after a newer one", async () => {
    const { loader, calls } = controlledLoader();
    const { result } = renderHook(() => useResource(loader, []));
    await waitFor(() => expect(calls).toHaveLength(1));
    await act(async () => calls[0]("first load"));
    await waitFor(() => expect(result.current.data).toBe("first load"));

    let slow;
    let fast;
    act(() => {
      slow = result.current.refresh();
    });
    act(() => {
      fast = result.current.refresh();
    });
    await waitFor(() => expect(calls).toHaveLength(3));
    await act(async () => {
      calls[2]("newer");
      await fast;
    });
    await act(async () => {
      calls[1]("older");
      await slow;
    });
    expect(result.current.data).toBe("newer");
  });

  it("does not overwrite a change the page made while the request was in flight", async () => {
    const { loader, calls } = controlledLoader();
    const { result } = renderHook(() => useResource(loader, []));
    await waitFor(() => expect(calls).toHaveLength(1));
    await act(async () => calls[0](["a"]));
    await waitFor(() => expect(result.current.data).toEqual(["a"]));

    let pending;
    act(() => {
      pending = result.current.refresh();
    });
    await waitFor(() => expect(calls).toHaveLength(2));
    // a pushed item is shown at once, while the request that started earlier is still on its way
    act(() => result.current.setData((list) => [...list, "pushed"]));
    await act(async () => calls[1](["a"])); // the older answer does not know about "pushed"
    expect(result.current.data).toEqual(["a", "pushed"]);

    // the hook asks again and takes the up-to-date answer
    await waitFor(() => expect(calls).toHaveLength(3));
    await act(async () => {
      calls[2](["a", "pushed"]);
      await pending;
    });
    expect(result.current.data).toEqual(["a", "pushed"]);
  });

  it("keeps the last good data when a quiet refresh fails", async () => {
    let fail = false;
    const { result } = renderHook(() =>
      useResource(async () => {
        if (fail) throw new Error("offline");
        return "ok";
      }, []),
    );
    await waitFor(() => expect(result.current.data).toBe("ok"));
    fail = true;
    await act(() => result.current.refresh());
    expect(result.current.data).toBe("ok");
    expect(result.current.error).toBeNull();
  });
});
