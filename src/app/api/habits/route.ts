import { authOptions } from "@/lib/auth/auth"
import { connectDB } from "@/utils/connectDB"
import { getServerSession } from "next-auth"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req:Request) {
    try {

        await connectDB()

        const { id } = await

        const session = await getServerSession(authOptions)
        if(!session) return NextResponse.json({error : "Please login first!"} , {status : 401})
        
    } catch (error) {
        console.error("Add habit error:" + error)
        return NextResponse.json({error : "There is an error in server"} , {status : 500})
    }
}