import { NextResponse } from "next/server";
// Kept for older open browser tabs. Real signups are queued by a database
// trigger; accepting arbitrary recipients here would create a public mail relay.
export async function POST() {
 return NextResponse.json({success:true,queuedBySignup:true});
}
