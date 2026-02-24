import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
// import your database client
import { prisma } from "@/lib/prisma"; // adjust if using another ORM/DB

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("CHANGE PASSWORD BODY:", body);

    const { user_id, oldPassword, newPassword } = body;

    // ---------- Validate payload ----------
    if (!user_id || !oldPassword || !newPassword) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    // ---------- Fetch user ----------
    const user = await prisma.user.findUnique({
      where: { id: user_id },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // ---------- Verify old password ----------
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 401 }
      );
    }

    // ---------- Hash new password ----------
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // ---------- Update password ----------
    await prisma.user.update({
      where: { id: user_id },
      data: { password: hashedPassword },
    });

    return NextResponse.json({ message: "Password updated successfully" });

  } catch (err: any) {
    console.error("CHANGE PASSWORD ERROR:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}