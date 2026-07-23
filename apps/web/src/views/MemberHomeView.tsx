/* eslint-disable */
// @ts-nocheck
import React from 'react';
import { AuthContextType } from '../types';
import TaskBoardView from '../components/tasks/TaskBoardView';

export default function MemberHomeView({ auth }: { auth: AuthContextType }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">👋 Xin chào, {auth.user?.fullName || auth.user?.username}</h2>
        <p className="text-xs text-slate-400">Theo dõi và quản lý các công việc của bạn.</p>
      </div>

      <TaskBoardView auth={auth} />
    </div>
  );
}
