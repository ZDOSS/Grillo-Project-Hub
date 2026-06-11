import "@testing-library/jest-dom/vitest";

function createMemoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear() {
      data.clear();
    },
    getItem(key: string) {
      return data.has(key) ? data.get(key)! : null;
    },
    key(index: number) {
      return Array.from(data.keys())[index] ?? null;
    },
    removeItem(key: string) {
      data.delete(key);
    },
    setItem(key: string, value: string) {
      data.set(key, value);
    }
  };
}

if (typeof window !== "undefined") {
  const maybeStorage = (() => {
    try {
      const probeKey = "__gph_test_probe__";
      window.localStorage?.setItem?.(probeKey, "ok");
      const value = window.localStorage?.getItem?.(probeKey);
      window.localStorage?.removeItem?.(probeKey);
      return value === "ok" ? window.localStorage : null;
    } catch {
      return null;
    }
  })();

  if (!maybeStorage) {
    const storage = createMemoryStorage();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: storage
    });
  }
}

// jsdom doesn't include matchMedia
if (typeof window !== "undefined" && !window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false
    })
  });
}
