'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { 
  Users as UsersIcon, Shield, Activity, Settings as SettingsIcon, 
  Plus, Trash2, Calendar, FileText, UserPlus, AlertTriangle, 
  CheckCircle, HelpCircle, Download, Reply, Upload
} from 'lucide-react';
import { format, differenceInHours, parseISO } from 'date-fns';

type Tab = 'exec' | 'teams' | 'users' | 'settings' | 'disputes' | 'reports' | 'logs' | 'holidays';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('exec');
  const [teams, setTeams] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({ vj_date_range_start: '', vj_date_range_end: '' });
  const [logs, setLogs] = useState<any[]>([]);
  const [allScores, setAllScores] = useState<any[]>([]);
  const [dailySummaries, setDailySummaries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // VJ Resignation States
  const [vjStatusData, setVjStatusData] = useState<Record<string, any>>({});
  const [vjEmploymentStatus, setVjEmploymentStatus] = useState<string>('ACTIVE');
  const [vjResignationDate, setVjResignationDate] = useState<string>('');
  const [vjIncludeScoresInTeam, setVjIncludeScoresInTeam] = useState<boolean>(true);

  // Holiday States
  const [holidayData, setHolidayData] = useState<any>({ team_holidays: [], individual_holidays: [] });
  // Holiday Form States
  const [holidayType, setHolidayType] = useState<'TEAM' | 'INDIVIDUAL'>('TEAM');
  const [holidayTeamId, setHolidayTeamId] = useState<string>('');
  const [holidayUserId, setHolidayUserId] = useState<string>('');
  const [holidayDate, setHolidayDate] = useState<string>('');
  const [holidayNote, setHolidayNote] = useState<string>('');

  // Form states
  const [adminUser, setAdminUser] = useState<any>(null);
  
  // Team Form
  const [teamName, setTeamName] = useState('');
  const [teamShift, setTeamShift] = useState('เช้า');
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);

  // User Form
  const [userUsername, setUserUsername] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState<'MC' | 'VJ' | 'ADMIN'>('VJ');
  const [userTeamId, setUserTeamId] = useState('');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  // User List Filters
  const [filterTeamId, setFilterTeamId] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Assign Member Form
  const [assigningTeamId, setAssigningTeamId] = useState<string | null>(null);
  const [selectedUserIdToAssign, setSelectedUserIdToAssign] = useState('');

  // Dispute Resolution Form
  const [resolvingScore, setResolvingScore] = useState<any | null>(null);
  const [resolutionReply, setResolutionReply] = useState('');
  const [resolutionScore, setResolutionScore] = useState<number | ''>('');

  // Report Edit Form
  const [editingReportRow, setEditingReportRow] = useState<any | null>(null);
  const [editReportConfirmed, setEditReportConfirmed] = useState<number | ''>('');
  const [editReportPending, setEditReportPending] = useState<number | ''>('');
  const [editReportDisputed, setEditReportDisputed] = useState<number | ''>('');

  // CSV Preview
  const [csvPreviewData, setCsvPreviewData] = useState<any | null>(null);

  // Status/Alert
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Today Date string YYYY-MM-DD
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.id) {
      setAdminUser(user);
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const cacheBuster = `?t=${Date.now()}`;
      const [teamsRes, usersRes, settingsRes, logsRes, scoresRes] = await Promise.all([
        fetch(`/api/teams${cacheBuster}`),
        fetch(`/api/admin/users${cacheBuster}`),
        fetch(`/api/admin/settings${cacheBuster}`),
        fetch(`/api/admin/logs${cacheBuster}`),
        fetch(`/api/scores${cacheBuster}`)
      ]);

      const [teamsData, usersData, settingsData, logsData, scoresData] = await Promise.all([
        teamsRes.json(),
        usersRes.json(),
        settingsRes.json(),
        logsRes.json(),
        scoresRes.json()
      ]);

      if (Array.isArray(teamsData)) {
        setTeams(teamsData);
      } else if (teamsData && teamsData.error) {
        showNotification(teamsData.error, false);
      }

      if (Array.isArray(usersData)) {
        setAllUsers(usersData);
      } else if (usersData && usersData.error) {
        showNotification(usersData.error, false);
      }

      if (settingsData && !settingsData.error) {
        setSettings(settingsData);
        if (settingsData.vj_status_data) {
          try {
            setVjStatusData(JSON.parse(settingsData.vj_status_data));
          } catch(e) {
            console.error('Error parsing vj_status_data', e);
          }
        } else {
          setVjStatusData({});
        }
        if (settingsData.holiday_data) {
          try {
            setHolidayData(JSON.parse(settingsData.holiday_data));
          } catch(e) {
            console.error('Error parsing holiday_data', e);
          }
        } else {
          setHolidayData({ team_holidays: [], individual_holidays: [] });
        }
      }

      if (Array.isArray(logsData)) {
        setLogs(logsData);
      }

      if (Array.isArray(scoresData)) {
        setAllScores(scoresData);
      }

    } catch (err) {
      console.error('Failed to load admin data:', err);
      showNotification('ไม่สามารถโหลดข้อมูลจาก Supabase ได้ กรุณาตรวจสอบการตั้งค่าตาราง', false);
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (msg: string, isSuccess = true) => {
    if (isSuccess) {
      setSuccessMsg(msg);
      setErrorMsg('');
      setTimeout(() => setSuccessMsg(''), 4000);
    } else {
      setErrorMsg(msg);
      setSuccessMsg('');
      setTimeout(() => setErrorMsg(''), 4000);
    }
  };

  // 1. Team CRUD
  const handleSaveTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminUser) return;

    try {
      const isEdit = !!editingTeamId;
      const url = '/api/admin/teams';
      const method = isEdit ? 'PUT' : 'POST';
      const body = {
        id: editingTeamId,
        name: teamName,
        shift: teamShift,
        adminId: adminUser.id
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        showNotification(isEdit ? 'แก้ไขทีมสำเร็จแล้ว' : 'สร้างทีมใหม่สำเร็จแล้ว');
        setTeamName('');
        setTeamShift('เช้า');
        setEditingTeamId(null);
        fetchData();
      } else {
        const err = await res.json();
        showNotification(err.error || 'เกิดข้อผิดพลาดในการเซฟทีม', false);
      }
    } catch (err) {
      showNotification('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', false);
    }
  };

  const handleDeleteTeam = async (id: string) => {
    if (!adminUser || !confirm('คุณแน่ใจหรือไม่ว่าต้องการลบทีมนี้? ข้อมูลสมาชิกและคะแนนที่เกี่ยวข้องกับทีมนี้จะถูกลบทั้งหมด')) return;

    try {
      const res = await fetch(`/api/admin/teams?id=${id}&adminId=${adminUser.id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        showNotification('ลบทีมสำเร็จแล้ว');
        fetchData();
      } else {
        const err = await res.json();
        showNotification(err.error || 'เกิดข้อผิดพลาดในการลบทีม', false);
      }
    } catch (err) {
      showNotification('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', false);
    }
  };

  // 2. User CRUD
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminUser) return;

    try {
      const isEdit = !!editingUserId;
      const url = '/api/admin/users';
      const method = isEdit ? 'PUT' : 'POST';
      const body = {
        id: editingUserId,
        username: userUsername,
        password: userPassword,
        name: userName,
        role: userRole,
        teamId: userTeamId || null,
        adminId: adminUser.id
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        const data = await res.json();
        const userId = isEdit ? editingUserId : data.user?.id;
        
        if (userId) {
          const updatedVjStatusData = { ...vjStatusData };
          if (userRole === 'VJ') {
            updatedVjStatusData[userId] = {
              status: vjEmploymentStatus,
              resignationDate: vjEmploymentStatus === 'RESIGNED' ? vjResignationDate : '',
              includeScoresInTeam: vjIncludeScoresInTeam
            };
          } else {
            delete updatedVjStatusData[userId];
          }

          // Save settings API call
          await fetch('/api/admin/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              vj_status_data: JSON.stringify(updatedVjStatusData),
              adminId: adminUser.id
            })
          });
        }

        showNotification(isEdit ? `แก้ไขข้อมูลผู้ใช้ ${userName} สำเร็จ` : `สร้างบัญชีผู้ใช้ ${userName} สำเร็จ`);
        setUserUsername('');
        setUserPassword('');
        setUserName('');
        setUserRole('VJ');
        setUserTeamId('');
        setEditingUserId(null);
        setVjEmploymentStatus('ACTIVE');
        setVjResignationDate('');
        setVjIncludeScoresInTeam(true);
        fetchData();
      } else {
        const err = await res.json();
        showNotification(err.error || 'เกิดข้อผิดพลาดในการบันทึกข้อมูลผู้ใช้', false);
      }
    } catch (err) {
      showNotification('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', false);
    }
  };

  const handleDeleteUser = async (userId: string, name: string) => {
    if (!adminUser || !confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบผู้ใช้ ${name}?`)) return;

    try {
      const res = await fetch(`/api/admin/users?id=${userId}&adminId=${adminUser.id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        // Clean up vj status data key
        const updatedVjStatusData = { ...vjStatusData };
        delete updatedVjStatusData[userId];
        await fetch('/api/admin/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vj_status_data: JSON.stringify(updatedVjStatusData),
            adminId: adminUser.id
          })
        });

        showNotification(`ลบผู้ใช้ ${name} สำเร็จ`);
        fetchData();
      } else {
        const err = await res.json();
        showNotification(err.error || 'เกิดข้อผิดพลาดในการลบผู้ใช้', false);
      }
    } catch (err) {
      showNotification('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', false);
    }
  };

  // Holiday CRUD
  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminUser || !holidayDate || !holidayNote.trim()) return;

    const updatedHolidayData = { ...holidayData };
    if (!updatedHolidayData.team_holidays) updatedHolidayData.team_holidays = [];
    if (!updatedHolidayData.individual_holidays) updatedHolidayData.individual_holidays = [];

    if (holidayType === 'TEAM') {
      if (!holidayTeamId) {
        showNotification('กรุณาเลือกทีม', false);
        return;
      }
      const team = teams.find(t => t.id === holidayTeamId);
      const isExist = updatedHolidayData.team_holidays.some(
        (h: any) => h.teamId === holidayTeamId && h.date === holidayDate
      );
      if (isExist) {
        showNotification('มีวันหยุดของทีมนี้ในวันที่เลือกแล้ว', false);
        return;
      }
      updatedHolidayData.team_holidays.push({
        id: 'th-' + crypto.randomUUID().substring(0, 8),
        teamId: holidayTeamId,
        teamName: team?.name || 'ไม่ทราบชื่อทีม',
        date: holidayDate,
        note: holidayNote.trim()
      });
    } else {
      if (!holidayUserId) {
        showNotification('กรุณาเลือก VJ', false);
        return;
      }
      const userObj = allUsers.find(u => u.id === holidayUserId);
      const isExist = updatedHolidayData.individual_holidays.some(
        (h: any) => h.userId === holidayUserId && h.date === holidayDate
      );
      if (isExist) {
        showNotification('มีวันหยุดของ VJ คนนี้ในวันที่เลือกแล้ว', false);
        return;
      }
      updatedHolidayData.individual_holidays.push({
        id: 'ih-' + crypto.randomUUID().substring(0, 8),
        userId: holidayUserId,
        userName: userObj?.name || 'ไม่ทราบชื่อ VJ',
        date: holidayDate,
        note: holidayNote.trim()
      });
    }

    try {
      setLoading(true);
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          holiday_data: JSON.stringify(updatedHolidayData),
          adminId: adminUser.id
        })
      });

      if (res.ok) {
        showNotification('บันทึกวันหยุดสำเร็จแล้ว');
        setHolidayDate('');
        setHolidayNote('');
        setHolidayTeamId('');
        setHolidayUserId('');
        fetchData();
      } else {
        const data = await res.json();
        showNotification(data.error || 'เกิดข้อผิดพลาดในการบันทึกวันหยุด', false);
      }
    } catch (err) {
      showNotification('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', false);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteHoliday = async (type: 'TEAM' | 'INDIVIDUAL', holidayId: string) => {
    if (!adminUser || !confirm('คุณแน่ใจหรือไม่ว่าต้องการลบวันหยุดนี้?')) return;

    const updatedHolidayData = { ...holidayData };
    if (type === 'TEAM') {
      updatedHolidayData.team_holidays = (updatedHolidayData.team_holidays || []).filter(
        (h: any) => h.id !== holidayId
      );
    } else {
      updatedHolidayData.individual_holidays = (updatedHolidayData.individual_holidays || []).filter(
        (h: any) => h.id !== holidayId
      );
    }

    try {
      setLoading(true);
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          holiday_data: JSON.stringify(updatedHolidayData),
          adminId: adminUser.id
        })
      });

      if (res.ok) {
        showNotification('ลบวันหยุดสำเร็จแล้ว');
        fetchData();
      } else {
        const data = await res.json();
        showNotification(data.error || 'เกิดข้อผิดพลาดในการลบวันหยุด', false);
      }
    } catch (err) {
      showNotification('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', false);
    } finally {
      setLoading(false);
    }
  };

  // 3. Member pairing (VJ/MC Assignment)
  const handleAssignMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminUser || !assigningTeamId || !selectedUserIdToAssign) return;

    try {
      const userToAssign = allUsers.find(u => u.id === selectedUserIdToAssign);
      const res = await fetch('/api/admin/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId: assigningTeamId,
          userId: selectedUserIdToAssign,
          roleInTeam: userToAssign?.role,
          adminId: adminUser.id
        })
      });

      if (res.ok) {
        showNotification('มอบหมายสมาชิกเข้าทีมสำเร็จ');
        setSelectedUserIdToAssign('');
        setAssigningTeamId(null);
        fetchData();
      } else {
        const err = await res.json();
        showNotification(err.error || 'ไม่สามารถมอบหมายสมาชิกได้', false);
      }
    } catch (err) {
      showNotification('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', false);
    }
  };

  const handleRemoveMember = async (teamId: string, userId: string) => {
    if (!adminUser || !confirm('คุณแน่ใจหรือไม่ว่าต้องการถอดสมาชิกคนนี้ออกจากทีม?')) return;

    try {
      const res = await fetch(`/api/admin/members?teamId=${teamId}&userId=${userId}&adminId=${adminUser.id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        showNotification('นำสมาชิกออกจากทีมสำเร็จ');
        fetchData();
      } else {
        const err = await res.json();
        showNotification(err.error || 'เกิดข้อผิดพลาดในการนำสมาชิกออก', false);
      }
    } catch (err) {
      showNotification('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', false);
    }
  };

  // 4. Save Settings (Cutoff dates)
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminUser) return;

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vj_date_range_start: settings.vj_date_range_start,
          vj_date_range_end: settings.vj_date_range_end,
          adminId: adminUser.id
        })
      });

      if (res.ok) {
        showNotification('อัปเดตการตั้งค่าระบบเรียบร้อย');
        fetchData();
      } else {
        const err = await res.json();
        showNotification(err.error || 'เกิดข้อผิดพลาดในการบันทึกค่า', false);
      }
    } catch (err) {
      showNotification('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', false);
    }
  };

  // 5. Dispute Resolution
  const handleResolveDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminUser || !resolvingScore) return;

    try {
      const res = await fetch(`/api/scores/${resolvingScore.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'confirmed',
          score: resolutionScore !== '' ? Number(resolutionScore) : resolvingScore.score,
          dispute_reply: resolutionReply,
          adminId: adminUser.id
        })
      });

      if (res.ok) {
        showNotification('แก้ปัญหาและยืนยันยอดเรียบร้อยแล้ว');
        setResolvingScore(null);
        setResolutionReply('');
        setResolutionScore('');
        fetchData();
      } else {
        const err = await res.json();
        showNotification(err.error || 'เกิดข้อผิดพลาดในการดำเนินการ', false);
      }
    } catch (err) {
      showNotification('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', false);
    }
  };

  // 6. CSV Report Export
  const handleExportCSV = () => {
    if (reportsData.length === 0) {
      showNotification('ไม่มีข้อมูลในช่วงเวลานี้สำหรับการส่งออก', false);
      return;
    }

    let csvContent = '\uFEFF'; // Adding UTF-8 BOM for Excel Thai language support
    csvContent += 'รายชื่อ VJ,ทีม,ยอดคะแนนสะสมที่อนุมัติแล้ว (Confirmed),ยอดรออนุมัติ (Pending),ยอดโต้แย้ง (Disputed),ยอดรวมทั้งหมด\n';

    reportsData.forEach((row: any) => {
      csvContent += `"${row.name}","${row.teamName}",${row.confirmed},${row.pending},${row.disputed},${row.total}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ZIVA_VJ_Report_${settings.vj_date_range_start}_to_${settings.vj_date_range_end}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !adminUser) return;

    if (!settings.vj_date_range_start || !settings.vj_date_range_end) {
      showNotification('กรุณาตั้งค่ารอบเวลาและระบบ (วันที่เริ่มและสิ้นสุดรอบ) ก่อนดำเนินการนำเข้าข้อมูล', false);
      e.target.value = '';
      return;
    }

    const fileInput = e.target;
    const reader = new FileReader();

    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split('\n');
      const rows: any[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Support both comma (,) and semicolon (;) as separators for Excel compatibility
        const separator = line.includes(';') ? ';' : ',';
        const parts = line.split(separator).map(p => p.replace(/^"|"$/g, '').trim());
        if (parts.length < 6) continue;

        const name = parts[0];
        const teamName = parts[1];
        const confirmed = Number(parts[2]) || 0;
        const pending = Number(parts[3]) || 0;
        const disputed = Number(parts[4]) || 0;
        const total = Number(parts[5]) || 0;

        rows.push({ name, teamName, confirmed, pending, disputed, total });
      }

      if (rows.length === 0) {
        showNotification('ไม่พบข้อมูลที่ถูกต้องในไฟล์ CSV', false);
        fileInput.value = '';
        return;
      }

      // Compute Preview:
      const newVJs: any[] = [];
      const updatedVJs: any[] = [];
      const unchangedVJs: any[] = [];

      rows.forEach(imported => {
        // Find existing VJ in reportsData
        const existing = reportsData.find(
          (r: any) => r.name.trim().toLowerCase() === imported.name.trim().toLowerCase()
        );

        if (!existing) {
          newVJs.push({
            name: imported.name,
            teamName: imported.teamName,
            confirmed: imported.confirmed,
            pending: imported.pending,
            disputed: imported.disputed,
            total: imported.total
          });
        } else {
          const isChanged =
            existing.confirmed !== imported.confirmed ||
            existing.pending !== imported.pending ||
            existing.disputed !== imported.disputed;

          if (isChanged) {
            updatedVJs.push({
              name: existing.name,
              teamName: existing.teamName,
              old: {
                confirmed: existing.confirmed,
                pending: existing.pending,
                disputed: existing.disputed,
                total: existing.total
              },
              new: {
                confirmed: imported.confirmed,
                pending: imported.pending,
                disputed: imported.disputed,
                total: imported.total
              }
            });
          } else {
            unchangedVJs.push({
              name: existing.name,
              teamName: existing.teamName,
              confirmed: imported.confirmed,
              pending: imported.pending,
              disputed: imported.disputed,
              total: imported.total
            });
          }
        }
      });

      setCsvPreviewData({
        totalRows: rows.length,
        newVJs,
        updatedVJs,
        unchangedVJs,
        rowsToImport: rows
      });

      fileInput.value = '';
    };

    reader.readAsText(file, 'UTF-8');
  };

  const handleConfirmImport = async () => {
    if (!adminUser || !csvPreviewData) return;

    setLoading(true);
    try {
      const res = await fetch('/api/admin/reports/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: csvPreviewData.rowsToImport,
          startDate: settings.vj_date_range_start,
          endDate: settings.vj_date_range_end,
          adminId: adminUser.id
        })
      });

      const data = await res.json();
      if (res.ok) {
        showNotification(`นำเข้าข้อมูลและบันทึกคะแนนรอบบิลเรียบร้อยแล้ว! (มีผู้ใช้ใหม่ถูกสร้างขึ้น: ${data.newUsersCount || 0} คน)`);
        setCsvPreviewData(null);
        fetchData();
      } else {
        showNotification(data.error || 'เกิดข้อผิดพลาดในการนำเข้าข้อมูล', false);
      }
    } catch (err) {
      showNotification('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', false);
    } finally {
      setLoading(false);
    }
  };

  const handleEditReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminUser || !editingReportRow) return;

    if (!settings.vj_date_range_start || !settings.vj_date_range_end) {
      showNotification('กรุณาตั้งค่ารอบเวลาและระบบ (วันที่เริ่มและสิ้นสุดรอบ) ก่อนดำเนินการแก้ไขคะแนน', false);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/admin/reports', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vjId: editingReportRow.vjId,
          teamId: editingReportRow.teamId,
          confirmed: Number(editReportConfirmed) || 0,
          pending: Number(editReportPending) || 0,
          disputed: Number(editReportDisputed) || 0,
          startDate: settings.vj_date_range_start,
          endDate: settings.vj_date_range_end,
          adminId: adminUser.id
        })
      });

      if (res.ok) {
        showNotification('แก้ไขข้อมูลคะแนนประจำรอบสำเร็จ');
        setEditingReportRow(null);
        fetchData();
      } else {
        const data = await res.json();
        showNotification(data.error || 'เกิดข้อผิดพลาดในการแก้ไขคะแนน', false);
      }
    } catch (err) {
      showNotification('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', false);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReport = async (row: any) => {
    if (!adminUser || !row) return;

    if (!settings.vj_date_range_start || !settings.vj_date_range_end) {
      showNotification('กรุณาตั้งค่ารอบเวลาและระบบ (วันที่เริ่มและสิ้นสุดรอบ) ก่อนดำเนินการลบคะแนน', false);
      return;
    }

    const confirmDel = window.confirm(
      `คุณต้องการลบคะแนนทั้งหมดของ VJ "${row.name}" ในรอบบิลนี้ (${settings.vj_date_range_start} ถึง ${settings.vj_date_range_end}) ใช่หรือไม่?\n` +
      `การลบจะไม่สามารถกู้คืนได้`
    );

    if (!confirmDel) return;

    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        vjId: row.vjId,
        teamId: row.teamId,
        startDate: settings.vj_date_range_start,
        endDate: settings.vj_date_range_end,
        adminId: adminUser.id
      });

      const res = await fetch(`/api/admin/reports?${queryParams.toString()}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        showNotification('ลบข้อมูลคะแนนประจำรอบสำเร็จ');
        fetchData();
      } else {
        const data = await res.json();
        showNotification(data.error || 'เกิดข้อผิดพลาดในการลบคะแนน', false);
      }
    } catch (err) {
      showNotification('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', false);
    } finally {
      setLoading(false);
    }
  };

  // -- Executive Dashboard Statistics --
  
  const teamsList = Array.isArray(teams) ? teams : [];
  const scoresList = Array.isArray(allScores) ? allScores : [];

  // A. MC Submission status today (Check if any score was saved for today per team)
  const mcSubmissionStatus = teamsList.map(team => {
    // See if any score has been submitted for this team today
    const submitted = scoresList.some(s => s.team_id === team.id && s.date === todayStr);
    return {
      teamId: team.id,
      teamName: team.name,
      shift: team.shift,
      status: submitted ? 'submitted' : 'pending'
    };
  });

  // B. VJ Confirmation Status Percentage
  const totalScoresCount = scoresList.length;
  const confirmedScoresCount = scoresList.filter(s => {
    const hours = differenceInHours(new Date(), parseISO(s.submitted_at));
    return s.status === 'confirmed' || (s.status === 'pending' && hours >= 72);
  }).length;
  
  const vjConfirmPercent = totalScoresCount > 0 ? Math.round((confirmedScoresCount / totalScoresCount) * 100) : 0;

  // C. Urgent Alerts
  const disputedScores = scoresList.filter(s => s.status === 'disputed');

  // -- Reports Calculations --
  // Group scores by VJ within the active range
  const reportsDataMap: Record<string, any> = {};
  scoresList.forEach(s => {
    const vjId = s.vj_id;
    const vjName = s.vj_name || 'ไม่ทราบชื่อ';
    
    // Find team name
    const team = teamsList.find(t => t.id === s.team_id);
    const teamName = team ? team.name : 'ไม่มีทีม';

    const hours = differenceInHours(new Date(), parseISO(s.submitted_at));
    const isAutoConfirmed = s.status === 'pending' && hours >= 72;
    const isConfirmed = s.status === 'confirmed' || isAutoConfirmed;
    const isDisputed = s.status === 'disputed';
    const isPending = s.status === 'pending' && !isAutoConfirmed;

    if (!reportsDataMap[vjId]) {
      reportsDataMap[vjId] = {
        vjId,
        teamId: s.team_id,
        name: vjName,
        teamName,
        confirmed: 0,
        pending: 0,
        disputed: 0,
        total: 0
      };
    }

    if (isConfirmed) reportsDataMap[vjId].confirmed += s.score;
    else if (isPending) reportsDataMap[vjId].pending += s.score;
    else if (isDisputed) reportsDataMap[vjId].disputed += s.score;
    
    reportsDataMap[vjId].total += s.score;
  });

  const reportsData = Object.values(reportsDataMap);

  const filteredUsers = (allUsers || []).filter(u => {
    const matchesSearch = 
      (u.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.username || '').toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesRole = !filterRole || u.role === filterRole;

    let matchesTeam = true;
    if (filterTeamId === 'none') {
      matchesTeam = !u.teamId;
    } else if (filterTeamId) {
      matchesTeam = u.teamId === filterTeamId;
    }

    return matchesSearch && matchesRole && matchesTeam;
  });

  return (
    <>
      <Navbar />
      <main className="container" style={{ padding: '2rem 1.5rem' }}>
        
        {/* Header Summary */}
        <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1>Admin Control Panel</h1>
            <p style={{ color: '#cbd5e1' }}>บริหารจัดการสถานะผู้ใช้ ทีม การตั้งค่าระบบ และการอนุมัติโต้แย้งคะแนน ZIVA</p>
          </div>
        </div>

        {/* Status Notification Alerts */}
        {successMsg && (
          <div className="alert" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', color: '#34d399', marginBottom: '1.5rem' }}>
            <div>{successMsg}</div>
          </div>
        )}
        {errorMsg && (
          <div className="alert alert-danger" style={{ marginBottom: '1.5rem' }}>
            <div>{errorMsg}</div>
          </div>
        )}

        {/* Tab Navigation */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', borderBottom: '1px solid var(--border)', marginBottom: '1.5rem', paddingBottom: '0.5rem' }}>
          <button 
            className="btn" 
            style={{ 
              background: activeTab === 'exec' ? 'var(--primary)' : 'transparent',
              color: '#fff',
              border: activeTab === 'exec' ? 'none' : '1px solid transparent',
              fontSize: '0.875rem'
            }}
            onClick={() => setActiveTab('exec')}
          >
            <Activity size={16} style={{ marginRight: '6px' }} />
            แดชบอร์ดสรุปสถานะ (Executive)
          </button>
          
          <button 
            className="btn" 
            style={{ 
              background: activeTab === 'disputes' ? 'var(--primary)' : 'transparent',
              color: '#fff',
              border: activeTab === 'disputes' ? 'none' : '1px solid transparent',
              fontSize: '0.875rem'
            }}
            onClick={() => setActiveTab('disputes')}
          >
            <AlertTriangle size={16} style={{ marginRight: '6px', color: disputedScores.length > 0 ? '#f59e0b' : 'inherit' }} />
            กล่องโต้แย้งข้อพิพาท ({disputedScores.length})
          </button>

          <button 
            className="btn" 
            style={{ 
              background: activeTab === 'teams' ? 'var(--primary)' : 'transparent',
              color: '#fff',
              border: activeTab === 'teams' ? 'none' : '1px solid transparent',
              fontSize: '0.875rem'
            }}
            onClick={() => setActiveTab('teams')}
          >
            <Shield size={16} style={{ marginRight: '6px' }} />
            จัดการโครงสร้างทีม & สมาชิก
          </button>
          <button 
            className="btn" 
            style={{ 
              background: activeTab === 'users' ? 'var(--primary)' : 'transparent',
              color: '#fff',
              border: activeTab === 'users' ? 'none' : '1px solid transparent',
              fontSize: '0.875rem'
            }}
            onClick={() => setActiveTab('users')}
          >
            <UserPlus size={16} style={{ marginRight: '6px' }} />
            จัดการบุคลากร (Staff)
          </button>
          <button 
            className="btn" 
            style={{ 
              background: activeTab === 'reports' ? 'var(--primary)' : 'transparent',
              color: '#fff',
              border: activeTab === 'reports' ? 'none' : '1px solid transparent',
              fontSize: '0.875rem'
            }}
            onClick={() => setActiveTab('reports')}
          >
            <Download size={16} style={{ marginRight: '6px' }} />
            รายงาน & Export CSV
          </button>
          <button 
            className="btn" 
            style={{ 
              background: activeTab === 'settings' ? 'var(--primary)' : 'transparent',
              color: '#fff',
              border: activeTab === 'settings' ? 'none' : '1px solid transparent',
              fontSize: '0.875rem'
            }}
            onClick={() => setActiveTab('settings')}
          >
            <SettingsIcon size={16} style={{ marginRight: '6px' }} />
            ตั้งค่ารอบเวลาและระบบ
          </button>
          <button 
            className="btn" 
            style={{ 
              background: activeTab === 'logs' ? 'var(--primary)' : 'transparent',
              color: '#fff',
              border: activeTab === 'logs' ? 'none' : '1px solid transparent',
              fontSize: '0.875rem'
            }}
            onClick={() => setActiveTab('logs')}
          >
            <FileText size={16} style={{ marginRight: '6px' }} />
            ประวัติการทำงาน (Logs)
          </button>
          
          <button 
            className="btn" 
            style={{ 
              background: activeTab === 'holidays' ? 'var(--primary)' : 'transparent',
              color: '#fff',
              border: activeTab === 'holidays' ? 'none' : '1px solid transparent',
              fontSize: '0.875rem'
            }}
            onClick={() => setActiveTab('holidays')}
          >
            <Calendar size={16} style={{ marginRight: '6px' }} />
            จัดการวันหยุด (Holidays)
          </button>
        </div>

        {/* Loading Indicator */}
        {loading && <div style={{ textAlign: 'center', padding: '3rem', color: '#cbd5e1' }}>กำลังเชื่อมต่อฐานข้อมูล Supabase...</div>}

        {/* Tab Contents */}
        {!loading && (
          <div>
            
            {/* A. EXECUTIVE DASHBOARD TAB */}
            {activeTab === 'exec' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                
                {/* Visual Widgets Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '1.5rem' }}>
                  
                  {/* MC Today Submission widget */}
                  <div className="glass-panel" style={{ background: 'rgba(30, 41, 59, 0.5)' }}>
                    <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>สถานะการกรอกคะแนนของ MC วันนี้ ({todayStr})</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {mcSubmissionStatus.map(team => (
                        <div key={team.teamId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)' }}>
                          <span>{team.teamName} ({team.shift})</span>
                          <span className={`badge ${team.status === 'submitted' ? 'badge-success' : 'badge-danger'}`}>
                            {team.status === 'submitted' ? 'กรอกเรียบร้อย' : 'ยังไม่ส่งยอด'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* VJ Confirmation percentage widget */}
                  <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
                    <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>เปอร์เซ็นต์ VJ กดยืนยันยอด</h3>
                    <div style={{ 
                      position: 'relative', 
                      width: '120px', 
                      height: '120px', 
                      borderRadius: '50%', 
                      background: `conic-gradient(var(--primary) ${vjConfirmPercent}%, rgba(255,255,255,0.05) ${vjConfirmPercent}%)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '0.75rem'
                    }}>
                      <div style={{
                        width: '100px',
                        height: '100px',
                        borderRadius: '50%',
                        background: '#0b1329',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.75rem',
                        fontWeight: 700
                      }}>
                        {vjConfirmPercent}%
                      </div>
                    </div>
                    <span style={{ fontSize: '0.825rem', color: '#94a3b8' }}>
                      ยืนยันแล้ว {confirmedScoresCount} จาก {totalScoresCount} รายการคะแนนทั้งหมด
                    </span>
                  </div>

                  {/* Quick Alerts widget */}
                  <div className="glass-panel" style={{ background: disputedScores.length > 0 ? 'rgba(239, 68, 68, 0.05)' : 'rgba(30, 41, 59, 0.5)', border: disputedScores.length > 0 ? '1px solid rgba(239,68,68,0.2)' : '1px solid var(--border)' }}>
                    <h3 style={{ marginBottom: '1rem', fontSize: '1rem', color: disputedScores.length > 0 ? '#f87171' : 'inherit' }}>การแจ้งเตือนด่วน (Alerts)</h3>
                    {disputedScores.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                          <AlertTriangle color="#f87171" size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
                          <div>
                            <span style={{ fontWeight: 600, color: '#f87171' }}>มีเคสโต้แย้งยอดคะแนน {disputedScores.length} รายการ</span>
                            <p style={{ fontSize: '0.75rem', color: '#cbd5e1', marginTop: '0.25rem' }}>กรุณาเข้าไปที่แท็บ "กล่องโต้แย้งข้อพิพาท" เพื่อพิจารณาและแก้ไขคะแนน</p>
                          </div>
                        </div>
                        <button className="btn btn-danger" style={{ width: '100%', fontSize: '0.825rem', padding: '0.5rem' }} onClick={() => setActiveTab('disputes')}>
                          ไปที่ห้องประนอมหนี้คะแนน
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b' }}>
                        <CheckCircle size={32} color="#10b981" style={{ marginBottom: '0.5rem' }} />
                        <span style={{ fontSize: '0.875rem' }}>ระบบเป็นปกติ ไม่มีเคสโต้แย้งค้างอยู่</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Score Summary Overview Table */}
                <div className="glass-panel">
                  <h3>ยอดรวมประเมินผลเบื้องต้นของ VJ</h3>
                  <div className="table-container" style={{ marginTop: '1rem' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>ชื่อ VJ</th>
                          <th>ทีม</th>
                          <th>ยอดคอนเฟิร์ม / ปิดรอบแล้ว</th>
                          <th>ยอดรอยืนยันยอด (Pending)</th>
                          <th>ยอดโต้แย้งค้างคา (Disputed)</th>
                          <th>ยอดรวมรวมผลงาน</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportsData.length === 0 ? (
                          <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>ไม่มีรายการคะแนนในช่วงเวลานี้</td></tr>
                        ) : (
                          reportsData.map((row: any, i) => (
                            <tr key={i}>
                              <td style={{ fontWeight: 600 }}>{row.name}</td>
                              <td>{row.teamName}</td>
                              <td style={{ color: '#34d399' }}>{row.confirmed.toLocaleString()}</td>
                              <td style={{ color: '#fbbf24' }}>{row.pending.toLocaleString()}</td>
                              <td style={{ color: '#f87171' }}>{row.disputed.toLocaleString()}</td>
                              <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{row.total.toLocaleString()}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* B. DISPUTES RESOLUTION CENTER TAB */}
            {activeTab === 'disputes' && (
              <div className="glass-panel">
                <h3>ระบบตรวจสอบและประนอมข้อพิพาท (Dispute Resolution Center)</h3>
                <p style={{ color: '#cbd5e1', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                  เมื่อ VJ รู้สึกว่า MC กรอกคะแนนผิดพลาดและกด "โต้แย้ง" รายการจะมาขึ้นที่นี่เพื่อรอการอนุมัติหรือปรับแก้คะแนนจากแอดมิน
                </p>

                {resolvingScore && (
                  <div style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid var(--primary)', padding: '1.5rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>
                    <h4>ดำเนินการแก้ไขปัญหา: VJ {resolvingScore.vj_name}</h4>
                    <p style={{ fontSize: '0.825rem', color: '#cbd5e1', marginTop: '0.25rem' }}>
                      วันที่: {resolvingScore.date} | คะแนนที่บันทึกมาเดิม: <strong>{resolvingScore.score}</strong>
                    </p>
                    <p style={{ fontSize: '0.825rem', color: '#f87171', background: 'rgba(239, 68, 68, 0.1)', padding: '0.5rem', borderRadius: '4px', margin: '0.5rem 0' }}>
                      เหตุผลโต้แย้งของ VJ: "{resolvingScore.dispute_reason}"
                    </p>

                    <form onSubmit={handleResolveDispute} style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.75rem' }}>ปรับคะแนนที่ถูกต้อง (ปล่อยว่างหากยึดคะแนนเดิม)</label>
                          <input 
                            type="number" 
                            className="form-input" 
                            value={resolutionScore}
                            onChange={(e) => setResolutionScore(e.target.value !== '' ? Number(e.target.value) : '')}
                            placeholder={resolvingScore.score}
                            onWheel={(e) => e.currentTarget.blur()}
                          />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.75rem' }}>ข้อความพิมพ์ชี้แจงกลับไปยัง VJ (Reply)</label>
                          <input 
                            type="text" 
                            className="form-input" 
                            value={resolutionReply}
                            onChange={(e) => setResolutionReply(e.target.value)}
                            placeholder="เช่น แก้ไขยอดเป็น 15400 ตามสลิปหลังบ้านแล้วครับ"
                            required
                          />
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button type="button" className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }} onClick={() => setResolvingScore(null)}>ยกเลิก</button>
                        <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem 1.5rem' }}>ยืนยันยอดผลการตรวจสอบ</button>
                      </div>
                    </form>
                  </div>
                )}

                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>วันที่</th>
                        <th>VJ</th>
                        <th>คะแนนเดิม</th>
                        <th>เหตุผลโต้แย้งจาก VJ</th>
                        <th>ผู้ดูแลระบบบันทึกตอบกลับ</th>
                        <th>สถานะการโต้แย้ง</th>
                        <th>การดำเนินการ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {disputedScores.length === 0 ? (
                        <tr>
                          <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                            ไม่มีเคสข้อพิพาทที่ยังไม่ได้แก้ไขในขณะนี้
                          </td>
                        </tr>
                      ) : (
                        disputedScores.map(score => (
                          <tr key={score.id}>
                            <td>{score.date}</td>
                            <td style={{ fontWeight: 600 }}>{score.vj_name}</td>
                            <td>{score.score.toLocaleString()}</td>
                            <td style={{ color: '#f87171', fontStyle: 'italic', maxWidth: '250px', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                              "{score.dispute_reason}"
                            </td>
                            <td>
                              {score.dispute_reply ? score.dispute_reply : <span style={{ color: '#475569' }}>ไม่มี</span>}
                            </td>
                            <td>
                              <span className="badge badge-danger">โต้แย้งข้อมูล</span>
                            </td>
                            <td>
                              <button 
                                className="btn btn-primary" 
                                style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                                onClick={() => {
                                  setResolvingScore(score);
                                  setResolutionScore('');
                                  setResolutionReply('');
                                }}
                              >
                                <Reply size={12} /> เข้าตรวจสอบหลักฐาน
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* C. TEAMS TAB */}
            {activeTab === 'teams' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
                {/* Team Form */}
                <div className="glass-panel" style={{ height: 'fit-content' }}>
                  <h3>{editingTeamId ? 'แก้ไขข้อมูลทีม' : 'สร้างทีมใหม่'}</h3>
                  <form onSubmit={handleSaveTeam} style={{ marginTop: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">ชื่อทีม (เช่น ZIVA-009)</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        value={teamName} 
                        onChange={(e) => setTeamName(e.target.value)} 
                        placeholder="ZIVA-XXX"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">กะการทำงาน (Shift)</label>
                      <select 
                        className="form-input" 
                        value={teamShift} 
                        onChange={(e) => setTeamShift(e.target.value)}
                        style={{ appearance: 'none', backgroundColor: 'rgba(15, 23, 42, 0.8)' }}
                      >
                        <option value="เช้า">เช้า (Morning Shift)</option>
                        <option value="ดึก">ดึก (Night Shift)</option>
                      </select>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
                      <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                        {editingTeamId ? 'บันทึกการแก้ไข' : 'สร้างทีม'}
                      </button>
                      {editingTeamId && (
                        <button 
                          type="button" 
                          className="btn btn-secondary" 
                          onClick={() => {
                            setEditingTeamId(null);
                            setTeamName('');
                            setTeamShift('เช้า');
                          }}
                        >
                          ยกเลิก
                        </button>
                      )}
                    </div>
                  </form>
                </div>

                {/* Teams List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {teams.map(team => (
                    <div key={team.id} className="glass-panel" style={{ background: 'rgba(30, 41, 59, 0.4)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
                        <div>
                          <h3 style={{ margin: 0, color: 'var(--primary)' }}>{team.name}</h3>
                          <span className={`badge ${team.shift === 'เช้า' ? 'badge-warning' : 'badge-success'}`} style={{ marginTop: '0.25rem' }}>
                            กะ: {team.shift}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}
                            onClick={() => {
                              setEditingTeamId(team.id);
                              setTeamName(team.name);
                              setTeamShift(team.shift);
                            }}
                          >
                            แก้ไข
                          </button>
                          <button 
                            className="btn btn-danger" 
                            style={{ padding: '0.25rem 0.5rem' }}
                            onClick={() => handleDeleteTeam(team.id)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Members list */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        {/* MCs */}
                        <div>
                          <h4 style={{ fontSize: '0.875rem', color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.25rem', marginBottom: '0.5rem' }}>
                            MC ประจำทีม (Data Entry)
                          </h4>
                          {team.members.filter((m: any) => m.role === 'MC').map((mc: any) => (
                            <div key={mc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                              <span>🎙️ {mc.name}</span>
                              <button 
                                style={{ color: '#ef4444', fontSize: '0.75rem' }} 
                                onClick={() => handleRemoveMember(team.id, mc.id)}
                              >
                                ถอน
                              </button>
                            </div>
                          ))}
                          {team.members.filter((m: any) => m.role === 'MC').length === 0 && (
                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>ยังไม่มี MC</span>
                          )}
                        </div>

                        {/* VJs */}
                        <div>
                          <h4 style={{ fontSize: '0.875rem', color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.25rem', marginBottom: '0.5rem' }}>
                            VJ ในสังกัด ({team.members.filter((m: any) => m.role === 'VJ').length})
                          </h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            {team.members.filter((m: any) => m.role === 'VJ').map((vj: any) => (
                              <div key={vj.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem' }}>
                                <span>👤 {vj.name}</span>
                                <button 
                                  style={{ color: '#ef4444', fontSize: '0.75rem' }} 
                                  onClick={() => handleRemoveMember(team.id, vj.id)}
                                >
                                  ถอน
                                </button>
                              </div>
                            ))}
                            {team.members.filter((m: any) => m.role === 'VJ').length === 0 && (
                              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>ยังไม่มี VJ</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Add member button */}
                      <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        {assigningTeamId === team.id ? (
                          <form onSubmit={handleAssignMember} style={{ display: 'flex', gap: '0.5rem' }}>
                            <select 
                              className="form-input"
                              value={selectedUserIdToAssign}
                              onChange={(e) => setSelectedUserIdToAssign(e.target.value)}
                              required
                              style={{ appearance: 'none', backgroundColor: 'rgba(15, 23, 42, 0.9)', padding: '0.5rem' }}
                            >
                              <option value="">-- เลือกผู้ใช้เพื่อมอบหมาย --</option>
                              {allUsers
                                .filter(u => u.role !== 'ADMIN' && !team.members.some((m: any) => m.id === u.id))
                                .map(u => (
                                  <option key={u.id} value={u.id}>
                                    [{u.role}] {u.name} ({u.username})
                                  </option>
                                ))}
                            </select>
                            <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem 1rem' }}>มอบหมาย</button>
                            <button type="button" className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }} onClick={() => setAssigningTeamId(null)}>ยกเลิก</button>
                          </form>
                        ) : (
                          <button 
                            className="btn btn-secondary" 
                            style={{ width: '100%', padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', fontSize: '0.825rem' }}
                            onClick={() => {
                              setAssigningTeamId(team.id);
                              setSelectedUserIdToAssign('');
                            }}
                          >
                            <Plus size={14} /> มอบหมายสมาชิก (VJ/MC) เพิ่มเติม
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* D. USERS TAB */}
            {activeTab === 'users' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
                {/* User Form */}
                <div className="glass-panel" style={{ height: 'fit-content' }}>
                  <h3>{editingUserId ? 'แก้ไขข้อมูลผู้ใช้' : 'สร้างผู้ใช้ใหม่'}</h3>
                  <form onSubmit={handleSaveUser} style={{ marginTop: '1.25rem' }}>
                    <div className="form-group">
                      <label className="form-label">ชื่อจริง (Full Name)</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        value={userName} 
                        onChange={(e) => setUserName(e.target.value)} 
                        placeholder="เช่น สมเกียรติ ยอดเยี่ยม"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Username</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        value={userUsername} 
                        onChange={(e) => setUserUsername(e.target.value)} 
                        placeholder="เช่น vj_somkiat"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Password</label>
                      <input 
                        type="password" 
                        className="form-input" 
                        value={userPassword} 
                        onChange={(e) => setUserPassword(e.target.value)} 
                        placeholder={editingUserId ? "ปล่อยว่างไว้เพื่อใช้รหัสผ่านเดิม" : "รหัสผ่านเข้าสู่ระบบ"}
                        required={!editingUserId}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">สิทธิ์การใช้งาน (Role)</label>
                      <select 
                        className="form-input" 
                        value={userRole} 
                        onChange={(e) => {
                          const role = e.target.value as any;
                          setUserRole(role);
                          if (role === 'ADMIN') {
                            setUserTeamId('');
                          }
                        }}
                        style={{ appearance: 'none', backgroundColor: 'rgba(15, 23, 42, 0.8)' }}
                      >
                        <option value="VJ">VJ (ผู้แสดงตน/ผู้เก็บคะแนนสะสม)</option>
                        <option value="MC">MC (ผู้บันทึกข้อมูลคะแนนรายวัน)</option>
                        <option value="ADMIN">ADMIN (ผู้ดูแลระบบ)</option>
                      </select>
                    </div>

                    {/* Group/Team assignment - Only for non-ADMIN users */}
                    {userRole !== 'ADMIN' && (
                      <div className="form-group">
                        <label className="form-label">กลุ่ม/ทีมที่สังกัด (Team / Group)</label>
                        <select 
                          className="form-input" 
                          value={userTeamId} 
                          onChange={(e) => setUserTeamId(e.target.value)}
                          style={{ appearance: 'none', backgroundColor: 'rgba(15, 23, 42, 0.8)' }}
                        >
                          <option value="">-- ไม่ระบุทีม / ไม่มีทีม --</option>
                          {teams.map((t: any) => (
                            <option key={t.id} value={t.id}>{t.name} ({t.shift})</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* VJ Resignation Settings */}
                    {userRole === 'VJ' && (
                      <div style={{ border: '1px solid rgba(255, 255, 255, 0.05)', padding: '1rem', borderRadius: 'var(--radius-sm)', marginTop: '1rem', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                        <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.875rem', color: 'var(--primary)' }}>ตั้งค่าสถานะผู้ใช้ (สำหรับ VJ เท่านั้น)</h4>
                        
                        <div className="form-group">
                          <label className="form-label" style={{ fontSize: '0.75rem' }}>สถานะการทำงาน</label>
                          <select
                            className="form-input"
                            value={vjEmploymentStatus}
                            onChange={(e) => setVjEmploymentStatus(e.target.value)}
                            style={{ appearance: 'none', backgroundColor: 'rgba(15, 23, 42, 0.8)', fontSize: '0.825rem' }}
                          >
                            <option value="ACTIVE">กำลังทำงาน (Active)</option>
                            <option value="RESIGNED">ลาออกแล้ว (Resigned)</option>
                          </select>
                        </div>

                        {vjEmploymentStatus === 'RESIGNED' && (
                          <>
                            <div className="form-group">
                              <label className="form-label" style={{ fontSize: '0.75rem' }}>วันที่ลาออก (มีผลตั้งแต่วันนี้เป็นต้นไป)</label>
                              <input
                                type="date"
                                className="form-input"
                                value={vjResignationDate}
                                onChange={(e) => setVjResignationDate(e.target.value)}
                                style={{ fontSize: '0.825rem' }}
                              />
                            </div>

                            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 0 }}>
                              <input
                                type="checkbox"
                                id="includeScoresInTeam"
                                checked={vjIncludeScoresInTeam}
                                onChange={(e) => setVjIncludeScoresInTeam(e.target.checked)}
                                style={{ width: 'auto', margin: 0 }}
                              />
                              <label htmlFor="includeScoresInTeam" className="form-label" style={{ fontSize: '0.75rem', marginBottom: 0, cursor: 'pointer' }}>
                                รวมคะแนนของคนนี้ในยอดรวมทีม? (หลังลาออก)
                              </label>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
                      <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                        {editingUserId ? 'บันทึกการแก้ไข' : 'สร้างผู้ใช้'}
                      </button>
                      {editingUserId && (
                        <button 
                          type="button" 
                          className="btn btn-secondary"
                          onClick={() => {
                            setEditingUserId(null);
                            setUserName('');
                            setUserUsername('');
                            setUserPassword('');
                            setUserRole('VJ');
                            setUserTeamId('');
                            setVjEmploymentStatus('ACTIVE');
                            setVjResignationDate('');
                            setVjIncludeScoresInTeam(true);
                          }}
                        >
                          ยกเลิก
                        </button>
                      )}
                    </div>
                  </form>
                </div>

                {/* User List Panel */}
                <div className="glass-panel">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0 }}>รายชื่อบุคลากรทั้งหมด ({filteredUsers.length} คน)</h3>
                  </div>

                  {/* Filters Section */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem', marginTop: '1.25rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.75rem', color: '#94a3b8' }}>ค้นหาตามชื่อ / Username</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="ค้นหา..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.75rem', color: '#94a3b8' }}>กรองตามทีม</label>
                      <select 
                        className="form-input" 
                        value={filterTeamId}
                        onChange={(e) => setFilterTeamId(e.target.value)}
                        style={{ appearance: 'none', backgroundColor: 'rgba(15, 23, 42, 0.8)' }}
                      >
                        <option value="">ทุกทีม</option>
                        <option value="none">ไม่มีทีม</option>
                        {teams.map((t: any) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.75rem', color: '#94a3b8' }}>กรองตามบทบาท (Role)</label>
                      <select 
                        className="form-input" 
                        value={filterRole}
                        onChange={(e) => setFilterRole(e.target.value)}
                        style={{ appearance: 'none', backgroundColor: 'rgba(15, 23, 42, 0.8)' }}
                      >
                        <option value="">ทุกบทบาท</option>
                        <option value="ADMIN">ADMIN</option>
                        <option value="MC">MC</option>
                        <option value="VJ">VJ</option>
                      </select>
                    </div>
                  </div>

                  {/* Users Table */}
                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>ชื่อ</th>
                          <th>Username</th>
                          <th>Role</th>
                          <th>สังกัดกลุ่ม/ทีม</th>
                          <th>สถานะการทำงาน</th>
                          <th>การจัดการ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.length === 0 ? (
                          <tr>
                            <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                              ไม่พบข้อมูลตามเงื่อนไขที่เลือก
                            </td>
                          </tr>
                        ) : (
                          filteredUsers.map((u: any) => (
                            <tr key={u.id}>
                              <td style={{ fontWeight: 600 }}>{u.name}</td>
                              <td>
                                <code>{u.username}</code>
                                {u.username.startsWith('temp_vj_') && (
                                  <span className="badge badge-danger" style={{ marginLeft: '0.5rem', fontSize: '0.7rem', padding: '0.15rem 0.35rem' }}>
                                    ⚠️ รอตั้งค่าบัญชี (Needs Setup)
                                  </span>
                                )}
                              </td>
                              <td>
                                <span className={`badge ${u.role === 'ADMIN' ? 'badge-danger' : u.role === 'MC' ? 'badge-warning' : 'badge-success'}`}>
                                  {u.role}
                                </span>
                              </td>
                              <td>
                                {u.teamName ? (
                                  <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{u.teamName}</span>
                                ) : (
                                  <span style={{ color: '#64748b', fontSize: '0.825rem' }}>ไม่มีทีม / สังกัด</span>
                                )}
                              </td>
                              <td>
                                {(() => {
                                  if (u.role !== 'VJ') return <span style={{ color: '#64748b' }}>-</span>;
                                  const status = vjStatusData[u.id];
                                  if (status && status.status === 'RESIGNED') {
                                    return (
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', alignItems: 'flex-start' }}>
                                        <span className="badge badge-danger" style={{ fontSize: '0.75rem' }}>
                                          ลาออกแล้ว {status.resignationDate ? `(${status.resignationDate})` : ''}
                                        </span>
                                        <span style={{ fontSize: '0.7rem', color: status.includeScoresInTeam ? '#34d399' : '#f87171', fontWeight: 600 }}>
                                          {status.includeScoresInTeam ? '✓ รวมคะแนนในทีม' : '✗ ไม่รวมคะแนนในทีม'}
                                        </span>
                                      </div>
                                    );
                                  }
                                  return <span className="badge badge-success" style={{ fontSize: '0.75rem' }}>ทำงานอยู่ (Active)</span>;
                                })()}
                              </td>
                              <td>
                                <div style={{ display: 'flex', gap: '0.35rem' }}>
                                  <button 
                                    className="btn btn-secondary" 
                                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                                    onClick={() => {
                                      setEditingUserId(u.id);
                                      setUserName(u.name || '');
                                      setUserUsername(u.username || '');
                                      setUserPassword('');
                                      setUserRole(u.role || 'VJ');
                                      setUserTeamId(u.teamId || '');
                                      if (u.role === 'VJ') {
                                        const statusObj = vjStatusData[u.id] || {};
                                        setVjEmploymentStatus(statusObj.status || 'ACTIVE');
                                        setVjResignationDate(statusObj.resignationDate || '');
                                        setVjIncludeScoresInTeam(statusObj.includeScoresInTeam !== false);
                                      } else {
                                        setVjEmploymentStatus('ACTIVE');
                                        setVjResignationDate('');
                                        setVjIncludeScoresInTeam(true);
                                      }
                                    }}
                                  >
                                    แก้ไข
                                  </button>
                                  {adminUser?.id !== u.id && (
                                    <button 
                                      className="btn btn-danger" 
                                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                                      onClick={() => handleDeleteUser(u.id, u.name)}
                                    >
                                      ลบ
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* E. REPORTS & EXPORT TAB */}
            {activeTab === 'reports' && (
              <div className="glass-panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <div>
                    <h3>รายงานและสรุปคะแนนประจำรอบ (Billing Cycle Reports)</h3>
                    <p style={{ color: '#cbd5e1', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                      รวบรวมคะแนนแยกตามคนสำหรับการนำไปคำนวณจ่ายเงินส่วนแบ่ง รายได้/เงินเดือน (อิงตามฟิลเตอร์วันที่: {settings.vj_date_range_start} ถึง {settings.vj_date_range_end})
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-primary" onClick={handleExportCSV} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Download size={16} /> ส่งออกเป็นไฟล์ CSV (Excel)
                    </button>
                    <label className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', margin: 0 }}>
                      <Upload size={16} /> นำเข้าข้อมูลจากไฟล์ CSV (Excel)
                      <input 
                        type="file" 
                        accept=".csv" 
                        onChange={handleImportCSV} 
                        style={{ display: 'none' }} 
                      />
                    </label>
                  </div>
                </div>

                {editingReportRow && (
                  <div className="glass-panel" style={{ background: 'rgba(30, 41, 59, 0.6)', marginBottom: '1.5rem', border: '1px solid var(--primary)' }}>
                    <h4 style={{ margin: 0, color: 'var(--primary)', marginBottom: '1rem' }}>
                      แก้ไขสรุปคะแนนประจำรอบ: {editingReportRow.name} ({editingReportRow.teamName})
                    </h4>
                    <form onSubmit={handleEditReportSubmit}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.75rem' }}>ยอดที่ปิดรอบเสร็จสิ้น (Confirmed)</label>
                          <input 
                            type="number" 
                            className="form-input" 
                            value={editReportConfirmed}
                            onChange={(e) => setEditReportConfirmed(e.target.value !== '' ? Number(e.target.value) : '')}
                            required
                            onWheel={(e) => e.currentTarget.blur()}
                          />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.75rem' }}>ยอดรอยืนยัน (Pending)</label>
                          <input 
                            type="number" 
                            className="form-input" 
                            value={editReportPending}
                            onChange={(e) => setEditReportPending(e.target.value !== '' ? Number(e.target.value) : '')}
                            required
                            onWheel={(e) => e.currentTarget.blur()}
                          />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.75rem' }}>ยอดติดโต้แย้ง (Disputed)</label>
                          <input 
                            type="number" 
                            className="form-input" 
                            value={editReportDisputed}
                            onChange={(e) => setEditReportDisputed(e.target.value !== '' ? Number(e.target.value) : '')}
                            required
                            onWheel={(e) => e.currentTarget.blur()}
                          />
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button type="button" className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }} onClick={() => setEditingReportRow(null)}>ยกเลิก</button>
                        <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem 1.5rem' }}>บันทึกการแก้ไข</button>
                      </div>
                    </form>
                  </div>
                )}

                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>ชื่อ VJ</th>
                        <th>ทีม</th>
                        <th>ยอดที่ปิดรอบเสร็จสิ้น (Confirmed)</th>
                        <th>ยอดรอยืนยัน (Pending)</th>
                        <th>ยอดติดโต้แย้ง (Disputed)</th>
                        <th style={{ fontWeight: 700 }}>ยอดรวมชั่วคราว</th>
                        <th style={{ textAlign: 'center' }}>การจัดการ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportsData.length === 0 ? (
                        <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>ไม่มีรายการสำหรับนำมาคำนวณรายงาน</td></tr>
                      ) : (
                        reportsData.map((row: any, i) => (
                          <tr key={i}>
                            <td style={{ fontWeight: 600 }}>{row.name}</td>
                            <td>{row.teamName}</td>
                            <td style={{ color: '#34d399', fontWeight: 600 }}>{row.confirmed.toLocaleString()}</td>
                            <td style={{ color: '#fbbf24' }}>{row.pending.toLocaleString()}</td>
                            <td style={{ color: '#f87171' }}>{row.disputed.toLocaleString()}</td>
                            <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{row.total.toLocaleString()}</td>
                            <td style={{ textAlign: 'center' }}>
                              <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                                <button 
                                  className="btn btn-secondary" 
                                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                                  onClick={() => {
                                    setEditingReportRow(row);
                                    setEditReportConfirmed(row.confirmed);
                                    setEditReportPending(row.pending);
                                    setEditReportDisputed(row.disputed);
                                  }}
                                >
                                  แก้ไข
                                </button>
                                <button 
                                  className="btn btn-secondary" 
                                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444' }}
                                  onClick={() => handleDeleteReport(row)}
                                >
                                  ลบ
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* F. SETTINGS TAB */}
            {activeTab === 'settings' && (
              <div className="glass-panel" style={{ maxWidth: '600px', margin: '0 auto' }}>
                <h3>กำหนดระยะเวลาการดึงคะแนนของ VJ</h3>
                <p style={{ color: '#cbd5e1', fontSize: '0.875rem', marginTop: '0.25rem', marginBottom: '1.5rem' }}>
                  เมื่อเปลี่ยนช่วงวันที่นี้ คะแนนสะสมในหน้าหลักของ VJ จะคำนวณและดึงผลลัพธ์เฉพาะในช่วงเวลานี้เท่านั้น
                </p>

                <form onSubmit={handleSaveSettings}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div className="form-group">
                      <label className="form-label">วันที่เริ่มรอบ (Start Date)</label>
                      <input 
                        type="date" 
                        className="form-input" 
                        value={settings.vj_date_range_start || ''} 
                        onChange={(e) => setSettings({ ...settings, vj_date_range_start: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">วันที่สิ้นสุดรอบ (End Date)</label>
                      <input 
                        type="date" 
                        className="form-input" 
                        value={settings.vj_date_range_end || ''} 
                        onChange={(e) => setSettings({ ...settings, vj_date_range_end: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                    บันทึกการตั้งค่า
                  </button>
                </form>
              </div>
            )}

            {/* G. LOGS TAB */}
            {activeTab === 'logs' && (
              <div className="glass-panel">
                <h3>ประวัติการแก้ไขระบบหลังบ้าน (Audit Logs)</h3>
                <p style={{ color: '#cbd5e1', fontSize: '0.875rem', marginBottom: '1rem' }}>
                  บันทึกประวัติการกระทำเพื่อความปลอดภัยและการตรวจสอบระบบย้อนหลัง
                </p>
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>วันเวลา</th>
                        <th>ผู้ดำเนินการ</th>
                        <th>ประเภทการกระทำ</th>
                        <th>รายละเอียด</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.length === 0 ? (
                        <tr>
                          <td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>
                            ไม่มีประวัติรายการ
                          </td>
                        </tr>
                      ) : (
                        logs.map(log => (
                          <tr key={log.id}>
                            <td style={{ whiteSpace: 'nowrap' }}>{new Date(log.created_at).toLocaleString('th-TH')}</td>
                            <td>{log.admin_name}</td>
                            <td>
                              <span className="badge" style={{ 
                                backgroundColor: log.action.includes('DELETE') ? 'rgba(239, 68, 68, 0.15)' : log.action.includes('CREATE') ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                                color: log.action.includes('DELETE') ? '#f87171' : log.action.includes('CREATE') ? '#34d399' : '#60a5fa'
                              }}>
                                {log.action}
                              </span>
                            </td>
                            <td>{log.details}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* H. HOLIDAYS TAB */}
            {activeTab === 'holidays' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
                {/* Left Column: Form */}
                <div className="glass-panel" style={{ height: 'fit-content' }}>
                  <h3>เพิ่มวันหยุดใหม่ (Add Holiday)</h3>
                  <form onSubmit={handleAddHoliday} style={{ marginTop: '1.25rem' }}>
                    <div className="form-group">
                      <label className="form-label">ประเภทวันหยุด</label>
                      <select
                        className="form-input"
                        value={holidayType}
                        onChange={(e) => setHolidayType(e.target.value as any)}
                        style={{ appearance: 'none', backgroundColor: 'rgba(15, 23, 42, 0.8)' }}
                      >
                        <option value="TEAM">วันหยุดทั้งทีม (Team Holiday)</option>
                        <option value="INDIVIDUAL">วันหยุดเฉพาะบุคคล (Individual Holiday)</option>
                      </select>
                    </div>

                    {holidayType === 'TEAM' ? (
                      <div className="form-group">
                        <label className="form-label">เลือกทีม</label>
                        <select
                          className="form-input"
                          value={holidayTeamId}
                          onChange={(e) => setHolidayTeamId(e.target.value)}
                          style={{ appearance: 'none', backgroundColor: 'rgba(15, 23, 42, 0.8)' }}
                          required
                        >
                          <option value="" disabled>-- กรุณาเลือกทีม --</option>
                          {teams.map((t: any) => (
                            <option key={t.id} value={t.id}>{t.name} ({t.shift})</option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="form-group">
                        <label className="form-label">เลือก VJ</label>
                        <select
                          className="form-input"
                          value={holidayUserId}
                          onChange={(e) => setHolidayUserId(e.target.value)}
                          style={{ appearance: 'none', backgroundColor: 'rgba(15, 23, 42, 0.8)' }}
                          required
                        >
                          <option value="" disabled>-- กรุณาเลือก VJ --</option>
                          {allUsers.filter((u: any) => u.role === 'VJ').map((u: any) => (
                            <option key={u.id} value={u.id}>{u.name} ({u.username})</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="form-group">
                      <label className="form-label">วันที่</label>
                      <input
                        type="date"
                        className="form-input"
                        value={holidayDate}
                        onChange={(e) => setHolidayDate(e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">บันทึก/หมายเหตุ</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="เช่น ลาป่วย, พักผ่อนประจำปี, ลาพักร้อน"
                        value={holidayNote}
                        onChange={(e) => setHolidayNote(e.target.value)}
                        required
                      />
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={loading}>
                      {loading ? 'กำลังบันทึก...' : 'บันทึกวันหยุด'}
                    </button>
                  </form>
                </div>

                {/* Right Column: Lists */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                  {/* Team Holidays */}
                  <div className="glass-panel">
                    <h3>วันหยุดทีมทั้งหมด (Team Holidays)</h3>
                    <div className="table-container" style={{ marginTop: '1rem' }}>
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>วันที่</th>
                            <th>ทีม</th>
                            <th>หมายเหตุ</th>
                            <th style={{ textAlign: 'center', width: '100px' }}>การจัดการ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(!holidayData.team_holidays || holidayData.team_holidays.length === 0) ? (
                            <tr>
                              <td colSpan={4} style={{ textAlign: 'center', padding: '1.5rem', color: '#64748b' }}>
                                ไม่มีบันทึกวันหยุดทีม
                              </td>
                            </tr>
                          ) : (
                            holidayData.team_holidays.map((h: any) => (
                              <tr key={h.id}>
                                <td style={{ fontWeight: 600 }}>{h.date}</td>
                                <td style={{ color: 'var(--primary)', fontWeight: 600 }}>{h.teamName}</td>
                                <td>{h.note}</td>
                                <td style={{ textAlign: 'center' }}>
                                  <button
                                    className="btn btn-danger"
                                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                                    onClick={() => handleDeleteHoliday('TEAM', h.id)}
                                    disabled={loading}
                                  >
                                    ลบ
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Individual Holidays */}
                  <div className="glass-panel">
                    <h3>วันหยุดรายบุคคลทั้งหมด (Individual Holidays)</h3>
                    <div className="table-container" style={{ marginTop: '1rem' }}>
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>วันที่</th>
                            <th>VJ</th>
                            <th>หมายเหตุ</th>
                            <th style={{ textAlign: 'center', width: '100px' }}>การจัดการ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(!holidayData.individual_holidays || holidayData.individual_holidays.length === 0) ? (
                            <tr>
                              <td colSpan={4} style={{ textAlign: 'center', padding: '1.5rem', color: '#64748b' }}>
                                ไม่มีบันทึกวันหยุดรายบุคคล
                              </td>
                            </tr>
                          ) : (
                            holidayData.individual_holidays.map((h: any) => (
                              <tr key={h.id}>
                                <td style={{ fontWeight: 600 }}>{h.date}</td>
                                <td style={{ color: '#34d399', fontWeight: 600 }}>{h.userName}</td>
                                <td>{h.note}</td>
                                <td style={{ textAlign: 'center' }}>
                                  <button
                                    className="btn btn-danger"
                                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                                    onClick={() => handleDeleteHoliday('INDIVIDUAL', h.id)}
                                    disabled={loading}
                                  >
                                    ลบ
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* CSV Import Preview Modal */}
        {csvPreviewData && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem'
          }}>
            <div className="glass-panel" style={{
              width: '100%',
              maxWidth: '800px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '2.5rem',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(30, 41, 59, 0.95)',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem'
            }}>
              <div>
                <h2 style={{ color: 'var(--primary)', marginBottom: '0.5rem', fontSize: '1.5rem', fontWeight: 700 }}>
                  🔍 ตรวจสอบและพรีวิวข้อมูลนำเข้า (CSV Preview)
                </h2>
                <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
                  ระบบตรวจสอบข้อมูลที่อัปโหลดเทียบกับฐานข้อมูลปัจจุบัน พบสรุปการเปลี่ยนแปลงดังนี้
                </p>
              </div>

              {/* Summary Statistics Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', padding: '1rem', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>จำนวนรายการทั้งหมด</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#60a5fa', marginTop: '0.25rem' }}>{csvPreviewData.totalRows}</div>
                </div>
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '1rem', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>สร้าง VJ ใหม่</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#34d399', marginTop: '0.25rem' }}>{csvPreviewData.newVJs.length}</div>
                </div>
                <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', padding: '1rem', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>อัพเดทยอด/ปรับเปลี่ยน</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#fbbf24', marginTop: '0.25rem' }}>{csvPreviewData.updatedVJs.length}</div>
                </div>
              </div>

              {/* Detailed Lists */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxHeight: '40vh', overflowY: 'auto', paddingRight: '0.5rem' }}>
                
                {/* Section 1: New VJs */}
                {csvPreviewData.newVJs.length > 0 && (
                  <div style={{ background: 'rgba(16, 185, 129, 0.03)', border: '1px solid rgba(16, 185, 129, 0.1)', padding: '1.25rem', borderRadius: 'var(--radius-md)' }}>
                    <h4 style={{ color: '#34d399', fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      🆕 รายชื่อ VJ ใหม่ที่จะถูกสร้างเข้าระบบ ({csvPreviewData.newVJs.length})
                    </h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {csvPreviewData.newVJs.map((vj: any, idx: number) => (
                        <span key={idx} className="badge" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#34d399', fontSize: '0.8rem', padding: '0.35rem 0.65rem' }}>
                          {vj.name} ({vj.teamName}) - ยอดรวม: {vj.total.toLocaleString()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Section 2: Updated VJs */}
                {csvPreviewData.updatedVJs.length > 0 && (
                  <div style={{ background: 'rgba(245, 158, 11, 0.03)', border: '1px solid rgba(245, 158, 11, 0.1)', padding: '1.25rem', borderRadius: 'var(--radius-md)' }}>
                    <h4 style={{ color: '#fbbf24', fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.75rem' }}>
                      ✏️ รายการที่มีการปรับเปลี่ยนยอด/แก้ไขคะแนน ({csvPreviewData.updatedVJs.length})
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {csvPreviewData.updatedVJs.map((item: any, idx: number) => (
                        <div key={idx} style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid #fbbf24', fontSize: '0.875rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontWeight: 600 }}>
                            <span style={{ color: '#f8fafc' }}>{item.name} ({item.teamName})</span>
                            <span style={{ color: '#94a3b8' }}>ยอดรวมเดิม: {item.old.total.toLocaleString()} → ยอดรวมใหม่: {item.new.total.toLocaleString()}</span>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', color: '#cbd5e1', fontSize: '0.8rem' }}>
                            <div>
                              <span style={{ color: '#ef4444' }}>ยอดเดิม:</span>
                              <br />
                              Confirmed: {item.old.confirmed.toLocaleString()} | Pending: {item.old.pending.toLocaleString()} | Disputed: {item.old.disputed.toLocaleString()}
                            </div>
                            <div>
                              <span style={{ color: '#10b981' }}>ยอดใหม่:</span>
                              <br />
                              Confirmed: {item.new.confirmed.toLocaleString()} | Pending: {item.new.pending.toLocaleString()} | Disputed: {item.new.disputed.toLocaleString()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Section 3: Unchanged VJs */}
                {csvPreviewData.unchangedVJs.length > 0 && (
                  <div style={{ background: 'rgba(255, 255, 255, 0.01)', border: '1px solid rgba(255, 255, 255, 0.05)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                    <details>
                      <summary style={{ color: '#94a3b8', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 500 }}>
                        📋 รายการที่ข้อมูลตรงกัน/ไม่มีการเปลี่ยนแปลง ({csvPreviewData.unchangedVJs.length} รายการ)
                      </summary>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.75rem' }}>
                        {csvPreviewData.unchangedVJs.map((vj: any, idx: number) => (
                          <span key={idx} style={{ color: '#64748b', fontSize: '0.75rem', background: 'rgba(255,255,255,0.03)', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)' }}>
                            {vj.name} ({vj.total.toLocaleString()})
                          </span>
                        ))}
                      </div>
                    </details>
                  </div>
                )}

              </div>

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1.25rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button 
                  onClick={() => setCsvPreviewData(null)}
                  className="btn btn-secondary"
                  style={{ padding: '0.6rem 1.5rem', fontSize: '0.9rem' }}
                  disabled={loading}
                >
                  ยกเลิก
                </button>
                <button 
                  onClick={handleConfirmImport}
                  className="btn btn-primary"
                  style={{ padding: '0.6rem 1.8rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  disabled={loading}
                >
                  {loading ? 'กำลังนำเข้าข้อมูล...' : 'ยืนยันการนำเข้าข้อมูล'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
