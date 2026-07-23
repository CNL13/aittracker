/* eslint-disable */
// @ts-nocheck
import React from 'react';
import { AuthContextType } from '../types';
import CheckInView from '../app/CheckInView';

export default function AdminReportsView({ auth }: { auth: AuthContextType }) {
  return <CheckInView auth={auth} />;
}
