export type Role = "first" | "second";

export type CoupleSettings = {
  startDate: string;
  nextMeeting: string;
  firstName: string;
  secondName: string;
};

export type CoupleData = {
  settings: CoupleSettings;
};
