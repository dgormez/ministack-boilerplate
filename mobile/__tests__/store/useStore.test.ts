import { useStore } from "../../store/useStore";

beforeEach(() => {
  useStore.setState({ auth: null, notes: [], isSyncing: false, lastSyncAt: null, isOnline: true });
});

describe("auth", () => {
  it("setAuth stores auth state", () => {
    useStore.getState().setAuth({ userId: "u1", email: "a@b.com", accessToken: "tok" });
    expect(useStore.getState().auth).toEqual({ userId: "u1", email: "a@b.com", accessToken: "tok" });
  });

  it("updateAccessToken replaces token only", () => {
    useStore.getState().setAuth({ userId: "u1", email: "a@b.com", accessToken: "old" });
    useStore.getState().updateAccessToken("new");
    expect(useStore.getState().auth?.accessToken).toBe("new");
    expect(useStore.getState().auth?.email).toBe("a@b.com");
  });

  it("updateAccessToken is a no-op when not logged in", () => {
    useStore.getState().updateAccessToken("x");
    expect(useStore.getState().auth).toBeNull();
  });

  it("resetAuth clears auth and notes", () => {
    useStore.getState().setAuth({ userId: "u1", email: "a@b.com", accessToken: "tok" });
    useStore.getState().addNote({ id: "n1", userId: "u1", title: "Hi", createdAt: "", updatedAt: "" });
    useStore.getState().resetAuth();
    expect(useStore.getState().auth).toBeNull();
    expect(useStore.getState().notes).toHaveLength(0);
  });
});

describe("notes", () => {
  const note = { id: "n1", userId: "u1", title: "Hello", body: "World", createdAt: "", updatedAt: "" };

  it("addNote prepends to the list", () => {
    useStore.getState().addNote(note);
    expect(useStore.getState().notes[0]).toEqual(note);
  });

  it("updateNote replaces by id", () => {
    useStore.getState().addNote(note);
    useStore.getState().updateNote({ ...note, title: "Updated" });
    expect(useStore.getState().notes[0].title).toBe("Updated");
  });

  it("removeNote removes by id", () => {
    useStore.getState().addNote(note);
    useStore.getState().removeNote("n1");
    expect(useStore.getState().notes).toHaveLength(0);
  });

  it("setNotes replaces the entire list", () => {
    useStore.getState().addNote(note);
    useStore.getState().setNotes([{ ...note, id: "n2" }]);
    expect(useStore.getState().notes).toHaveLength(1);
    expect(useStore.getState().notes[0].id).toBe("n2");
  });
});
