import { NextResponse } from 'next/server';
import { supabase, logActionSupabase } from '@/lib/supabase';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { status, dispute_reason, dispute_reply, score, adminId } = body;

    // Build update object dynamically
    const updateData: any = {};
    if (status !== undefined) updateData.status = status;
    if (dispute_reason !== undefined) updateData.dispute_reason = dispute_reason;
    if (dispute_reply !== undefined) updateData.dispute_reply = dispute_reply;
    if (score !== undefined) updateData.score = Number(score);

    // If status is being updated, log confirmed_at
    if (status === 'confirmed') {
      updateData.confirmed_at = new Date().toISOString();
    }

    const { data: updatedScores, error } = await supabase
      .from('scores')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        users!vj_id ( name )
      `);

    if (error) throw error;

    if (!updatedScores || updatedScores.length === 0) {
      return NextResponse.json({ error: 'Score record not found' }, { status: 404 });
    }

    const updatedScoreRecord = updatedScores[0];

    // Log action if Admin did it
    if (adminId) {
      let actionMsg = `Admin processed score entry for VJ ${updatedScoreRecord.users?.name} on ${updatedScoreRecord.date}.`;
      if (score !== undefined) actionMsg += ` Updated score to ${score}.`;
      if (status !== undefined) actionMsg += ` Updated status to ${status}.`;
      if (dispute_reply !== undefined) actionMsg += ` Added reply: "${dispute_reply}".`;

      await logActionSupabase(adminId, 'RESOLVE_DISPUTE', actionMsg);
    }

    return NextResponse.json({ success: true, updated: updatedScoreRecord });
  } catch (error: any) {
    console.error('Error updating score on Supabase:', error);
    return NextResponse.json({ error: error.message || 'Failed to update score' }, { status: 500 });
  }
}
