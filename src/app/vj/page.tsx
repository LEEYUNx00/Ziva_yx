'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { differenceInHours, parseISO } from 'date-fns';
import { Check, X, AlertCircle, Clock, Award, ChevronRight, User } from 'lucide-react';

export default function VJDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [personalScores, setPersonalScores] = useState<any[]>([]);
  const [teamScores, setTeamScores] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [vjTeam, setVjTeam] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Settings (Date Range)
  const [dateRange, setDateRange] = useState<any>({ start: '', end: '' });

  // Dispute Modal state
  const [disputingScoreId, setDisputingScoreId] = useState<string | null>(null);
  const [disputeReason, setDisputeReason] = useState('');

  // Selected VJ details view (for showing detailed day-by-day click on team members)
  const [selectedVjDetails, setSelectedVjDetails] = useState<any>(null);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    if (!userData.id || userData.role !== 'VJ') {
      router.push('/');
      return;
    }
    setUser(userData);
    initDashboard(userData.id);
  }, [router]);

  const initDashboard = async (vjId: string) => {
    try {
      // 1. Fetch system date settings first
      const cacheBuster = `?t=${Date.now()}`;
      const settingsRes = await fetch(`/api/admin/settings${cacheBuster}`);
      const settingsData = await settingsRes.json();
      setDateRange({
        start: settingsData.vj_date_range_start || '',
        end: settingsData.vj_date_range_end || ''
      });

      // 2. Fetch personal scores
      const scoresRes = await fetch(`/api/scores?vjId=${vjId}&t=${Date.now()}`);
      const scoresData = await scoresRes.json();
      if (Array.isArray(scoresData)) {
        setPersonalScores(scoresData);
      }

      // 3. Find VJ's team
      const teamsRes = await fetch(`/api/teams${cacheBuster}`);
      const teamsData = await teamsRes.json();
      
      if (Array.isArray(teamsData)) {
        const myTeam = teamsData.find((t: any) => t.members.some((m: any) => m.id === vjId));
        if (myTeam) {
          setVjTeam(myTeam);
          setTeamMembers(myTeam.members.filter((m: any) => m.role === 'VJ'));
          
          // Fetch all scores for this team to build team dashboard
          const teamScoresRes = await fetch(`/api/scores?teamId=${myTeam.id}&t=${Date.now()}`);
          const teamScoresData = await teamScoresRes.json();
          if (Array.isArray(teamScoresData)) {
            setTeamScores(teamScoresData);
          }
        }
      }
    } catch (err) {
      console.error('Error loading VJ dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (scoreId: string) => {
    try {
      const res = await fetch(`/api/scores/${scoreId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'confirmed' })
      });
      if (res.ok) {
        setPersonalScores(prev => prev.map(s => s.id === scoreId ? { ...s, status: 'confirmed', confirmed_at: new Date().toISOString() } : s));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDisputeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disputingScoreId || !disputeReason.trim()) return;

    try {
      const res = await fetch(`/api/scores/${disputingScoreId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'disputed',
          dispute_reason: disputeReason
        })
      });
      if (res.ok) {
        setPersonalScores(prev => prev.map(s => s.id === disputingScoreId ? { ...s, status: 'disputed', dispute_reason: disputeReason } : s));
        setDisputingScoreId(null);
        setDisputeReason('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!user || loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>กำลังโหลดข้อมูลแดชบอร์ด VJ...</div>;

  const personalScoresList = Array.isArray(personalScores) ? personalScores : [];
  const teamMembersList = Array.isArray(teamMembers) ? teamMembers : [];
  const teamScoresList = Array.isArray(teamScores) ? teamScores : [];

  // Calculate total confirmed/pending score for logged-in VJ
  const totalScore = personalScoresList.reduce((sum, s) => sum + s.score, 0);

  // Calculate team's total monthly score (all members, all dates in current billing cycle)
  const teamMonthlyTotal = teamScoresList.reduce((sum, s) => sum + s.score, 0);

  // Calculate team's daily total score on a given date
  const getTeamDailyTotal = (dateStr: string) => {
    return teamScoresList
      .filter((s: any) => s.date === dateStr)
      .reduce((sum, s) => sum + s.score, 0);
  };

  // Group team scores by VJ to create Team Rankings
  const rankings = teamMembersList.map((member: any) => {
    const memberScores = teamScoresList.filter((s: any) => s.vj_id === member.id);
    const sum = memberScores.reduce((acc, s) => acc + s.score, 0);
    return {
      id: member.id,
      name: member.name,
      totalScore: sum,
      scores: memberScores
    };
  }).sort((a, b) => b.totalScore - a.totalScore);

  return (
    <>
      <Navbar />
      <main className="container" style={{ padding: '2rem 1.5rem' }}>
        
        {/* Header summary */}
        <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>VJ Dashboard</h1>
            <p style={{ color: '#cbd5e1' }}>
              ยินดีต้อนรับ, {user.name} 
              {vjTeam && ` | ทีม: ${vjTeam.name} (${vjTeam.shift})`} 
              | รอบเวลารวมคะแนน: {dateRange.start ? `${dateRange.start} ถึง ${dateRange.end}` : 'ไม่ได้ตั้งรอบดึงข้อมูล'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div className="glass-panel" style={{ padding: '1rem 1.5rem', textAlign: 'center', minWidth: '160px' }}>
              <div style={{ fontSize: '0.875rem', color: '#cbd5e1', marginBottom: '0.25rem' }}>คะแนนสะสมของฉัน</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--primary)' }}>
                {totalScore.toLocaleString()}
              </div>
            </div>
            {vjTeam && (
              <div className="glass-panel" style={{ padding: '1rem 1.5rem', textAlign: 'center', minWidth: '160px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                <div style={{ fontSize: '0.875rem', color: '#cbd5e1', marginBottom: '0.25rem' }}>ยอดรวมทั้งเดือนของทีม</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#60a5fa' }}>
                  {teamMonthlyTotal.toLocaleString()}
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '2rem' }}>
          
          {/* Left Column: Team Rankings (Team Dashboard) */}
          <div className="glass-panel" style={{ height: 'fit-content' }}>
            <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Award size={22} color="var(--primary)" /> อันดับคะแนนภายในทีม {vjTeam ? vjTeam.name : ''} (Ranking)
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {rankings.map((rank, index) => {
                const isMe = rank.id === user.id;
                return (
                  <div 
                    key={rank.id} 
                    onClick={() => setSelectedVjDetails(rank)}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between', 
                      padding: '0.75rem 1rem', 
                      borderRadius: 'var(--radius-md)', 
                      background: isMe ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                      border: isMe ? '1px solid var(--primary)' : '1px solid var(--border)',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = isMe ? 'rgba(59, 130, 246, 0.25)' : 'rgba(255, 255, 255, 0.05)'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = isMe ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.02)'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontWeight: 700, width: '20px', color: index === 0 ? '#fbbf24' : index === 1 ? '#94a3b8' : '#cbd5e1' }}>
                        {index + 1}
                      </span>
                      <span style={{ fontWeight: isMe ? 600 : 400 }}>{rank.name} {isMe && '(ฉัน)'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{rank.totalScore.toLocaleString()}</span>
                      <ChevronRight size={16} color="#64748b" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Personal Daily Scores */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* View Vj Details drilldown */}
            {selectedVjDetails && (
              <div className="glass-panel" style={{ border: '1px solid var(--primary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ margin: 0, color: 'var(--primary)' }}>รายละเอียดคะแนนรายวัน: {selectedVjDetails.name}</h3>
                  <button className="btn btn-secondary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }} onClick={() => setSelectedVjDetails(null)}>ปิดหน้าต่าง</button>
                </div>
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>วันที่</th>
                        <th>คะแนน</th>
                        <th>ยอดรวมรายวันของทีม</th>
                        <th>สถานะการตรวจสอบ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedVjDetails.scores.length === 0 ? (
                        <tr><td colSpan={4} style={{ textAlign: 'center', padding: '1.5rem' }}>ไม่มีข้อมูล</td></tr>
                      ) : (
                        selectedVjDetails.scores.map((s: any) => (
                          <tr key={s.id}>
                            <td>{s.date}</td>
                            <td>{s.score.toLocaleString()}</td>
                            <td style={{ fontWeight: 600, color: '#60a5fa' }}>{getTeamDailyTotal(s.date).toLocaleString()}</td>
                            <td>
                              <span className={`badge ${s.status === 'confirmed' ? 'badge-success' : s.status === 'disputed' ? 'badge-danger' : 'badge-warning'}`}>
                                {s.status === 'confirmed' ? 'ยืนยันแล้ว' : s.status === 'disputed' ? 'โต้แย้ง' : 'รอตรวจสอบ'}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* My Daily Scores (Confirmation System) */}
            <div className="glass-panel">
              <h3 style={{ marginBottom: '1.25rem' }}>คะแนนรายวันและระบบยืนยันยอดของฉัน</h3>
              
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>วันที่</th>
                      <th>คะแนนของฉัน</th>
                      <th>ยอดรวมรายวันของทีม</th>
                      <th>สถานะ</th>
                      <th>ข้อความตอบกลับจากแอดมิน</th>
                      <th style={{ textAlign: 'right' }}>การดำเนินการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {personalScoresList.length === 0 ? (
                      <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>ไม่มีข้อมูลการส่งคะแนน</td></tr>
                    ) : (
                      personalScoresList.map(score => {
                        const hoursPassed = differenceInHours(new Date(), parseISO(score.submitted_at));
                        const isAutoConfirmed = score.status === 'pending' && hoursPassed >= 72;
                        const displayStatus = isAutoConfirmed ? 'confirmed' : score.status;

                        return (
                          <tr key={score.id}>
                            <td>{score.date}</td>
                            <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{score.score.toLocaleString()}</td>
                            <td style={{ fontWeight: 600, color: '#60a5fa' }}>{getTeamDailyTotal(score.date).toLocaleString()}</td>
                            <td>
                              {displayStatus === 'pending' && (
                                <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                  <Clock size={12} />
                                  รอตรวจสอบ ({Math.max(0, 72 - hoursPassed)} ชม. เหลือ)
                                </span>
                              )}
                              {displayStatus === 'confirmed' && (
                                <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                  <Check size={12} />
                                  ยืนยันยอดแล้ว {isAutoConfirmed && '(Auto)'}
                                </span>
                              )}
                              {displayStatus === 'disputed' && (
                                <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                  <AlertCircle size={12} />
                                  โต้แย้งยอด
                                </span>
                              )}
                            </td>
                            <td>
                              {score.dispute_reply ? (
                                <span style={{ fontSize: '0.825rem', color: '#60a5fa' }}>{score.dispute_reply}</span>
                              ) : score.dispute_reason ? (
                                <span style={{ fontSize: '0.825rem', color: '#94a3b8', fontStyle: 'italic' }}>ส่งข้อพิพาท: "{score.dispute_reason}"</span>
                              ) : (
                                <span style={{ color: '#475569' }}>-</span>
                              )}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              {score.status === 'pending' && !isAutoConfirmed ? (
                                <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end' }}>
                                  <button 
                                    className="btn btn-primary" 
                                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
                                    onClick={() => handleConfirm(score.id)}
                                  >
                                    ยืนยันยอด
                                  </button>
                                  <button 
                                    className="btn btn-danger" 
                                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', backgroundColor: 'transparent', border: '1px solid var(--danger)', color: 'var(--danger)' }}
                                    onClick={() => setDisputingScoreId(score.id)}
                                  >
                                    โต้แย้ง
                                  </button>
                                </div>
                              ) : (
                                <span style={{ color: '#64748b', fontSize: '0.75rem' }}>เสร็จสิ้น</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Dispute Reason Popup Modal */}
        {disputingScoreId && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100
          }}>
            <div className="glass-panel" style={{ width: '100%', maxWidth: '500px' }}>
              <h3>ระบุเหตุผลการโต้แย้งยอดคะแนน</h3>
              <p style={{ fontSize: '0.875rem', color: '#cbd5e1', marginTop: '0.25rem', marginBottom: '1.25rem' }}>
                เหตุผลนี้จะถูกส่งไปที่ฝ่ายดูแลระบบ (Admin) เพื่อทำการตรวจสอบหลักฐานเทียบกับหลังบ้าน TikTok อีกครั้ง
              </p>
              
              <form onSubmit={handleDisputeSubmit}>
                <div className="form-group">
                  <label className="form-label">เหตุผลที่โต้แย้ง / ยอดที่ถูกต้องคือเท่าใด</label>
                  <textarea 
                    className="form-input"
                    rows={4}
                    value={disputeReason}
                    onChange={(e) => setDisputeReason(e.target.value)}
                    placeholder="เช่น ยอดจริงวันนี้ใน TikTok คือ 15,400 ไม่ใช่ 1,540 ครับ รบกวนตรวจสอบด้วยครับ"
                    required
                    style={{ resize: 'none', fontFamily: 'inherit', padding: '0.75rem' }}
                  ></textarea>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => {
                      setDisputingScoreId(null);
                      setDisputeReason('');
                    }}
                  >
                    ยกเลิก
                  </button>
                  <button type="submit" className="btn btn-danger">
                    ส่งเรื่องโต้แย้ง
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
