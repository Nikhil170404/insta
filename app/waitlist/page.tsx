import { cookies } from "next/headers";
import WaitlistClient from "./WaitlistClient";

export default async function Page() {
    const cookieStore = await cookies();
    const joined = cookieStore.get("wl_joined")?.value === "1";

    return <WaitlistClient alreadyJoined={joined} />;
}
