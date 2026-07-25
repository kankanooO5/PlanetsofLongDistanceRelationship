import { RelationshipEntry } from "../../features/onboarding/components/RelationshipEntry";

export default function EntryPreviewPage() {
  return (
    <>
      <div
        style={{
          position: "fixed",
          zIndex: 10000,
          top: 8,
          right: 8,
          padding: "5px 8px",
          borderRadius: 999,
          background: "#292538",
          color: "#fff",
          fontSize: 10,
          fontWeight: 700,
        }}
      >
        ENTRY UI V3
      </div>

      <RelationshipEntry />
    </>
  );
}
