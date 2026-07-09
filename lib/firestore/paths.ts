export const userMedicinesPath = (userId: string) => `users/${userId}/medicines` as const;

export const userRemindersPath = (userId: string) => `users/${userId}/reminders` as const;

export const userPatientsPath = (userId: string) => `users/${userId}/patients` as const;

export const userProfileDoc = (userId: string) => ['users', userId] as const;
