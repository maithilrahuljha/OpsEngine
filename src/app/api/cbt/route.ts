import { NextRequest, NextResponse } from "next/server";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { cbtScores } from "@/db/schema";
import { requireWrite } from "@/lib/api-guard";

export async function POST(req: NextRequest) {
  const { error } = await requireWrite("cbt");
  if (error) return error;

  try {
    const { cadetId, examTitle, physics, chemistry, math } = await req.json();
    const cid = Number(cadetId);
    if (Number.isNaN(cid) || !examTitle) {
      return NextResponse.json(
        { error: "Cadet and exam title are required." },
        { status: 400 }
      );
    }

    const p = Math.min(100, Math.max(0, Number(physics) || 0));
    const c = Math.min(100, Math.max(0, Number(chemistry) || 0));
    const m = Math.min(100, Math.max(0, Number(math) || 0));
    const total = Math.round(((p + c + m) / 3) * 100) / 100;

    const [inserted] = await db
      .insert(cbtScores)
      .values({
        cadetId: cid,
        examTitle,
        physics: p,
        chemistry: c,
        math: m,
        totalScore: total,
        allIndiaRank: 0,
      })
      .returning();

    // Recompute All-India Ranks for this exam based on total score
    const rows = await db
      .select({ id: cbtScores.id })
      .from(cbtScores)
      .where(eq(cbtScores.examTitle, examTitle))
      .orderBy(desc(cbtScores.totalScore));

    for (let i = 0; i < rows.length; i++) {
      await db
        .update(cbtScores)
        .set({ allIndiaRank: i + 1 })
        .where(eq(cbtScores.id, rows[i].id));
    }

    const [final] = await db
      .select()
      .from(cbtScores)
      .where(eq(cbtScores.id, inserted.id));

    return NextResponse.json({ score: final }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to record CBT score." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { error } = await requireWrite("cbt");
  if (error) return error;
  try {
    const { id } = await req.json();
    const [deleted] = await db
      .delete(cbtScores)
      .where(eq(cbtScores.id, Number(id)))
      .returning();
    if (!deleted) {
      return NextResponse.json({ error: "Score not found." }, { status: 404 });
    }
    // Re-rank remaining rows in the same exam
    await db.execute(sql`
      UPDATE cbt_scores AS c SET all_india_rank = r.rnk
      FROM (
        SELECT id, ROW_NUMBER() OVER (ORDER BY total_score DESC) AS rnk
        FROM cbt_scores WHERE exam_title = ${deleted.examTitle}
      ) r
      WHERE c.id = r.id
    `);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete score." }, { status: 500 });
  }
}
