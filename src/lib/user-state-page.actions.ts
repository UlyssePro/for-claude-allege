import { prisma } from "@/lib/prisma";

export type UserStatePage = {
  id: string;
  userId: string;
  page: string;
  subPage: string | null;
  printPage: boolean;
  pdfView: boolean;
  excelView: boolean;
  sessSelect: boolean;
  isFreezed: boolean;
  popupActions: boolean;
  itemsDeleted: boolean;
  stateSidebar: boolean;
  btnPrintFPJ: boolean;
  stateForm: boolean;
  grillET: boolean;
  sessionYear: string | null;
  sessionYearSchoolSM: string | null;
  sessionYearSchoolLG: string | null;
  idMat: string | null;
  idProf: string | null;
  idClasse: string | null;
  idClasseType: string | null;
  idClasseCat: string | null;
  idDtHebdo: string | null;
  idGenre: string | null;
  idLieu: string | null;
  idHour: string | null;
  itemId: string | null;
  typeForm: string | null;
  dateFrom: string | null;
  dateTo: string | null;
  datePointage: string | null;
  sidebarClass: string | null;
  labelBC: string | null;
  createdAt: string;
  updatedAt: string;
};

export async function getUserStatePages(_userId: string): Promise<UserStatePage[]> {
  return [];
}

export async function getUserStatePage(
  _userId: string,
  _page: string,
  _subPage?: string | null,
): Promise<UserStatePage | null> {
  return null;
}

export async function getOrCreateUserStatePage(
  _userId: string,
  _page: string,
  _subPage?: string | null,
): Promise<UserStatePage> {
  return {
    id: "",
    userId: _userId,
    page: _page,
    subPage: _subPage ?? null,
    printPage: false,
    pdfView: false,
    excelView: false,
    sessSelect: false,
    isFreezed: false,
    popupActions: false,
    itemsDeleted: false,
    stateSidebar: false,
    btnPrintFPJ: false,
    stateForm: false,
    grillET: false,
    sessionYear: null,
    sessionYearSchoolSM: null,
    sessionYearSchoolLG: null,
    idMat: null,
    idProf: null,
    idClasse: null,
    idClasseType: null,
    idClasseCat: null,
    idDtHebdo: null,
    idGenre: null,
    idLieu: null,
    idHour: null,
    itemId: null,
    typeForm: null,
    dateFrom: null,
    dateTo: null,
    datePointage: null,
    sidebarClass: null,
    labelBC: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export async function createUserStatePage(
  _data: Record<string, unknown>,
): Promise<UserStatePage> {
  return {
    id: "",
    userId: "",
    page: "",
    subPage: null,
    printPage: false,
    pdfView: false,
    excelView: false,
    sessSelect: false,
    isFreezed: false,
    popupActions: false,
    itemsDeleted: false,
    stateSidebar: false,
    btnPrintFPJ: false,
    stateForm: false,
    grillET: false,
    sessionYear: null,
    sessionYearSchoolSM: null,
    sessionYearSchoolLG: null,
    idMat: null,
    idProf: null,
    idClasse: null,
    idClasseType: null,
    idClasseCat: null,
    idDtHebdo: null,
    idGenre: null,
    idLieu: null,
    idHour: null,
    itemId: null,
    typeForm: null,
    dateFrom: null,
    dateTo: null,
    datePointage: null,
    sidebarClass: null,
    labelBC: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export async function updateUserStatePage(
  _id: string,
  _data: Record<string, unknown>,
): Promise<UserStatePage> {
  return {
    id: _id,
    userId: "",
    page: "",
    subPage: null,
    printPage: false,
    pdfView: false,
    excelView: false,
    sessSelect: false,
    isFreezed: false,
    popupActions: false,
    itemsDeleted: false,
    stateSidebar: false,
    btnPrintFPJ: false,
    stateForm: false,
    grillET: false,
    sessionYear: null,
    sessionYearSchoolSM: null,
    sessionYearSchoolLG: null,
    idMat: null,
    idProf: null,
    idClasse: null,
    idClasseType: null,
    idClasseCat: null,
    idDtHebdo: null,
    idGenre: null,
    idLieu: null,
    idHour: null,
    itemId: null,
    typeForm: null,
    dateFrom: null,
    dateTo: null,
    datePointage: null,
    sidebarClass: null,
    labelBC: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export async function upsertUserStatePage(
  _userId: string,
  _page: string,
  _subPage: string | null,
  _data: Record<string, unknown>,
): Promise<UserStatePage> {
  return {
    id: "",
    userId: _userId,
    page: _page,
    subPage: _subPage,
    printPage: false,
    pdfView: false,
    excelView: false,
    sessSelect: false,
    isFreezed: false,
    popupActions: false,
    itemsDeleted: false,
    stateSidebar: false,
    btnPrintFPJ: false,
    stateForm: false,
    grillET: false,
    sessionYear: null,
    sessionYearSchoolSM: null,
    sessionYearSchoolLG: null,
    idMat: null,
    idProf: null,
    idClasse: null,
    idClasseType: null,
    idClasseCat: null,
    idDtHebdo: null,
    idGenre: null,
    idLieu: null,
    idHour: null,
    itemId: null,
    typeForm: null,
    dateFrom: null,
    dateTo: null,
    datePointage: null,
    sidebarClass: null,
    labelBC: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export async function deleteUserStatePage(_id: string): Promise<UserStatePage> {
  return {
    id: _id,
    userId: "",
    page: "",
    subPage: null,
    printPage: false,
    pdfView: false,
    excelView: false,
    sessSelect: false,
    isFreezed: false,
    popupActions: false,
    itemsDeleted: false,
    stateSidebar: false,
    btnPrintFPJ: false,
    stateForm: false,
    grillET: false,
    sessionYear: null,
    sessionYearSchoolSM: null,
    sessionYearSchoolLG: null,
    idMat: null,
    idProf: null,
    idClasse: null,
    idClasseType: null,
    idClasseCat: null,
    idDtHebdo: null,
    idGenre: null,
    idLieu: null,
    idHour: null,
    itemId: null,
    typeForm: null,
    dateFrom: null,
    dateTo: null,
    datePointage: null,
    sidebarClass: null,
    labelBC: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export async function deleteUserStatePagesByUser(_userId: string): Promise<void> {
  // no-op
}
