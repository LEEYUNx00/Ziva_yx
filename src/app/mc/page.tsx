'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { format } from 'date-fns';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function MCDashboard() {
  const router = useRouter();
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [date, setDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [tiktokTotal, setTiktokTotal] = useState<number | ''>('');
  const [vjScores, setVjScores] = useState<Record<string, number | ''>>({});
  
  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [user, setUser] = useState<any>(null);

  // VJ creation states
  const [showAddVjModal, setShowAddVjModal] = useState(false);
  const [newVjName, setNewVjName] = useState('');
  const [isAddingVj, setIsAddingVj] = useState(false);
  const [addVjError, setAddVjError] = useState('');

  // Resignation and Holiday states
  const [vjStatusData, setVjStatusData] = useState<Record<string, any>>({});
  const [holidayData, setHolidayData] = useState<any>({ team_holidays: [], individual_holidays: [] });

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    if (!userData.id || userData.role !== 'MC') {
      router.push('/');
      return;
    }
    setUser(userData);

    // Fetch ALL teams to support cross-team logging
    fetch(`/api/teams?t=${Date.now()}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setTeams(data);
        } else if (data && data.error) {
          setErrorMsg(data.error);
        }
      })
      .catch(err => {
        console.error(err);
        setErrorMsg('ไม่สามารถเชื่อมต่อดึงข้อมูลทีมได้');
      });

    // Fetch Settings for holiday and resignation data
    fetch(`/api/admin/settings?t=${Date.now()}`)
      .then(res => res.json())
      .then(data => {
        if (data.vj_status_data) {
          try {
            setVjStatusData(JSON.parse(data.vj_status_data));
          } catch(e) {
            console.error('Error parsing vjStatusData in MC Dashboard', e);
          }
        }
        if (data.holiday_data) {
          try {
            setHolidayData(JSON.parse(data.holiday_data));
          } catch(e) {
            console.error('Error parsing holidayData in MC Dashboard', e);
          }
        }
      })
      .catch(err => console.error('Error fetching settings on MC page:', err));
  }, [router]);

  // Pre-fill VJ holiday scores with 0 when date/team/holidayData changes
  useEffect(() => {
    if (!selectedTeam) return;
    const newScores: Record<string, number | ''> = {};
    const team = teamsList.find(t => t.id === selectedTeam);
    const vjs = (team?.members?.filter((m: any) => m.role === 'VJ') || []).filter((vj: any) => {
      const status = vjStatusData[vj.id];
      if (status && status.status === 'RESIGNED') {
        if (!status.resignationDate) return false;
        return date < status.resignationDate;
      }
      return true;
    });

    vjs.forEach((vj: any) => {
      const vjHoliday = (holidayData.individual_holidays || []).find((h: any) => h.userId === vj.id && h.date === date);
      if (vjHoliday) {
        newScores[vj.id] = 0;
      }
    });
    setVjScores(newScores);
  }, [date, selectedTeam, holidayData, teams, vjStatusData]);

  const teamsList = Array.isArray(teams) ? teams : [];
  const currentTeam = teamsList.find(t => t.id === selectedTeam);
  
  // Filter out VJs that are Resigned (either completely or on/after their resignation date)
  const vjsInTeam = (currentTeam?.members?.filter((m: any) => m.role === 'VJ') || []).filter((vj: any) => {
    const status = vjStatusData[vj.id];
    if (status && status.status === 'RESIGNED') {
      if (!status.resignationDate) return false; // resigned completely
      return date < status.resignationDate; // only show if selected date is before resignation date
    }
    return true;
  });

  const isAssignedTeam = (team: any) => {
    if (!user || !team || !team.members) return false;
    return team.members.some((m: any) => m.id === user.id && m.role === 'MC');
  };

  const handleScoreChange = (vjId: string, val: string) => {
    setVjScores(prev => ({
      ...prev,
      [vjId]: val === '' ? '' : Number(val)
    }));
  };

  const calculatedTotal = Object.values(vjScores).reduce<number>((sum, val) => sum + (Number(val) || 0), 0);
  const isBalanced = tiktokTotal !== '' && calculatedTotal === Number(tiktokTotal);
  const hasMismatch = tiktokTotal !== '' && calculatedTotal !== Number(tiktokTotal);

  const handleAddVjSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVjName.trim() || !selectedTeam || !user) return;

    setIsAddingVj(true);
    setAddVjError('');

    try {
      const res = await fetch('/api/mc/vj', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newVjName,
          teamId: selectedTeam,
          mcId: user.id
        })
      });

      const data = await res.json();
      if (res.ok) {
        // Append the new VJ to the current team's members in teams state
        setTeams(prev => prev.map(t => {
          if (t.id === selectedTeam) {
            return {
              ...t,
              members: [...(t.members || []), {
                id: data.user.id,
                name: data.user.name,
                role: 'VJ',
                role_in_team: 'VJ'
              }]
            };
          }
          return t;
        }));

        setNewVjName('');
        setShowAddVjModal(false);
        setSuccessMsg(`เพิ่ม VJ ${data.user.name} เรียบร้อยแล้ว! (ชื่อผู้ใช้ชั่วคราว: ${data.user.username})`);
      } else {
        setAddVjError(data.error || 'เกิดข้อผิดพลาดในการสร้าง VJ');
      }
    } catch (err) {
      setAddVjError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    } finally {
      setIsAddingVj(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isBalanced) {
      setErrorMsg('ยอดรวมไม่ตรงกัน กรุณาตรวจสอบอีกครั้ง');
      return;
    }

    // Double check if submitting for a team that is not assigned to this MC
    if (currentTeam && !isAssignedTeam(currentTeam)) {
      const confirmed = window.confirm(`คุณกำลังบันทึกคะแนนให้กับทีม "${currentTeam.name}" ซึ่งไม่ใช่ทีมที่คุณรับผิดชอบหลัก ต้องการดำเนินการต่อหรือไม่?`);
      if (!confirmed) return;
    }

    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          teamId: selectedTeam,
          mcId: user.id,
          tiktokTotal: Number(tiktokTotal),
          vjScores
        })
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMsg('บันทึกคะแนนสำเร็จ ระบบเริ่มนับถอยหลัง 3 วันสำหรับการยืนยันยอดของ VJ');
        // Reset form
        setTiktokTotal('');
        setVjScores({});
      } else {
        setErrorMsg(data.error || 'เกิดข้อผิดพลาด');
      }
    } catch (err) {
      setErrorMsg('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="container" style={{ padding: '2rem 1.5rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1>MC Data Entry</h1>
          <p style={{ color: '#cbd5e1' }}>บันทึกคะแนนรายวันสำหรับทีมที่คุณดูแล (ระบบจะทำการ Cross-check คะแนนรวมของ TikTok โดยอัตโนมัติ)</p>
        </div>

        <div className="glass-panel" style={{ maxWidth: '800px', margin: '0 auto' }}>
          
          {successMsg && (
            <div className="alert" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', color: '#34d399' }}>
              <CheckCircle2 size={24} />
              <div>{successMsg}</div>
            </div>
          )}

          {errorMsg && (
            <div className="alert alert-danger">
              <AlertCircle size={24} />
              <div>{errorMsg}</div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
              <div className="form-group">
                <label className="form-label">วันที่</label>
                <input 
                  type="date" 
                  className="form-input" 
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">เลือกทีมเพื่อกรอกข้อมูล</label>
                <select 
                  className="form-input" 
                  value={selectedTeam}
                  onChange={(e) => {
                    setSelectedTeam(e.target.value);
                    setVjScores({});
                    setSuccessMsg('');
                    setErrorMsg('');
                  }}
                  required
                  style={{ appearance: 'none', backgroundColor: 'rgba(15, 23, 42, 0.8)' }}
                >
                  <option value="" disabled>-- กรุณาเลือกทีม --</option>
                  {teamsList.filter(t => isAssignedTeam(t)).length > 0 && (
                    <optgroup label="⭐ ทีมในความรับผิดชอบของคุณ">
                      {teamsList.filter(t => isAssignedTeam(t)).map(t => (
                        <option key={t.id} value={t.id}>{t.name} ({t.shift})</option>
                      ))}
                    </optgroup>
                  )}
                  {teamsList.filter(t => !isAssignedTeam(t)).length > 0 && (
                    <optgroup label="🌐 ทีมอื่นๆ (ช่วยกรอกข้อมูล)">
                      {teamsList.filter(t => !isAssignedTeam(t)).map(t => (
                        <option key={t.id} value={t.id}>{t.name} ({t.shift})</option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>
            </div>

            {selectedTeam && currentTeam && !isAssignedTeam(currentTeam) && (
              <div className="alert" style={{ marginTop: '-1rem', marginBottom: '1.5rem', backgroundColor: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', color: '#fbbf24' }}>
                <AlertCircle size={20} />
                <div>
                  <strong>คำเตือน:</strong> คุณไม่ได้ประจำอยู่ในทีมนี้ (ระบบจะบันทึกว่าคุณเข้ามาช่วยบันทึกคะแนน)
                </div>
              </div>
            )}

            {(() => {
              const teamHol = (holidayData.team_holidays || []).find((h: any) => h.teamId === selectedTeam && h.date === date);
              if (teamHol) {
                return (
                  <div className="alert" style={{ marginTop: '-1rem', marginBottom: '1.5rem', backgroundColor: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', color: '#60a5fa' }}>
                    <AlertCircle size={20} />
                    <div>
                      <strong>วันหยุดทีม:</strong> วันนี้เป็นวันหยุดของทีม ({teamHol.note || 'ไม่มีบันทึกเพิ่มเติม'})
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            {selectedTeam && (
              <>
                <div style={{ padding: '1.5rem', background: 'rgba(15, 23, 42, 0.5)', borderRadius: 'var(--radius-md)', marginBottom: '2rem', border: '1px solid var(--border)' }}>
                  <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    ยอดอ้างอิงรวมจาก TikTok
                  </h3>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <input 
                      type="number" 
                      className="form-input" 
                      placeholder="กรอกยอดรวมของวันเพื่อทำ Cross-check..."
                      value={tiktokTotal}
                      onChange={(e) => setTiktokTotal(e.target.value ? Number(e.target.value) : '')}
                      required
                      style={{ fontSize: '1.25rem', padding: '1rem' }}
                      onWheel={(e) => e.currentTarget.blur()}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ margin: 0 }}>รายชื่อ VJ ในสังกัด</h3>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
                    onClick={() => {
                      setShowAddVjModal(true);
                      setAddVjError('');
                      setNewVjName('');
                    }}
                  >
                    + เพิ่ม VJ ใหม่
                  </button>
                </div>

                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>ชื่อ VJ</th>
                        <th style={{ width: '200px' }}>คะแนนรายวัน</th>
                      </tr>
                    </thead>
                    <tbody>
                       {vjsInTeam.map((vj: any) => {
                        const vjHoliday = (holidayData.individual_holidays || []).find((h: any) => h.userId === vj.id && h.date === date);
                        return (
                          <tr key={vj.id}>
                            <td>
                              👤 {vj.name}
                              {vjHoliday && (
                                <span className="badge badge-success" style={{ marginLeft: '0.5rem', fontSize: '0.7rem', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)' }}>
                                  💼 วันหยุด ({vjHoliday.note})
                                </span>
                              )}
                            </td>
                            <td>
                              <input 
                                type="number" 
                                className="form-input" 
                                placeholder={vjHoliday ? "0 (วันหยุด)" : "0"}
                                value={vjScores[vj.id] !== undefined ? vjScores[vj.id] : ''}
                                onChange={(e) => handleScoreChange(vj.id, e.target.value)}
                                onWheel={(e) => e.currentTarget.blur()}
                              />
                            </td>
                          </tr>
                        );
                      })}
                      {vjsInTeam.length === 0 && (
                        <tr>
                          <td colSpan={2} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                            ไม่พบรายชื่อ VJ ในทีมนี้
                          </td>
                        </tr>
                      )}
                    </tbody>
                    {vjsInTeam.length > 0 && (
                      <tfoot>
                        <tr style={{ backgroundColor: 'rgba(30, 41, 59, 0.8)', fontWeight: 600 }}>
                          <td style={{ textAlign: 'right', padding: '1rem' }}>ผลรวมคะแนน VJ ทั้งหมด:</td>
                          <td style={{ padding: '1rem', color: hasMismatch ? '#f87171' : isBalanced ? '#34d399' : 'inherit' }}>
                            {calculatedTotal.toLocaleString()}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>

                {hasMismatch && (
                  <div style={{ marginTop: '1rem', color: '#f87171', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <AlertCircle size={16} />
                    ยอดรวม VJ ({calculatedTotal}) ไม่ตรงกับยอดรวม TikTok ({tiktokTotal}) กรุณาตรวจสอบยอดเงินหรือคะแนนให้ถูกต้อง!
                  </div>
                )}

                <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
                  <button 
                    type="submit" 
                    className={`btn ${isBalanced ? 'btn-primary' : 'btn-secondary'}`}
                    disabled={!isBalanced || isLoading || vjsInTeam.length === 0}
                    style={{ opacity: (!isBalanced || isLoading) ? 0.5 : 1, cursor: (!isBalanced || isLoading) ? 'not-allowed' : 'pointer' }}
                  >
                    {isLoading ? 'กำลังบันทึก...' : 'ส่งข้อมูล'}
                  </button>
                </div>
              </>
            )}
          </form>
        </div>

        {/* Add VJ Modal */}
        {showAddVjModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1.5rem'
          }}>
            <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', border: '1px solid var(--primary)', padding: '1.75rem' }}>
              <h3 style={{ marginBottom: '1.25rem' }}>เพิ่ม VJ ใหม่ลงในทีม</h3>
              
              {addVjError && (
                <div className="alert alert-danger" style={{ marginBottom: '1.25rem', fontSize: '0.875rem' }}>
                  <AlertCircle size={16} />
                  <div>{addVjError}</div>
                </div>
              )}

              <form onSubmit={handleAddVjSubmit}>
                <div className="form-group">
                  <label className="form-label">ชื่อของ VJ</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newVjName}
                    onChange={(e) => setNewVjName(e.target.value)}
                    placeholder="เช่น Taeyong, Taeyeon"
                    required
                    autoFocus
                  />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowAddVjModal(false);
                      setNewVjName('');
                      setAddVjError('');
                    }}
                    disabled={isAddingVj}
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isAddingVj}
                  >
                    {isAddingVj ? 'กำลังบันทึก...' : 'บันทึก'}
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
