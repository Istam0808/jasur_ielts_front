import { MockUiProvider } from "@/components/common/MockUiContext";

export default function MockByIdLayout({ children }) {
    return <MockUiProvider>{children}</MockUiProvider>;
}
