import Papa from 'papaparse';
import { AthleteData } from '../types';

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/18vwsJi_J0vByCk0wvFte3Orf3UmB0PqsQ6KlPSYySVI/export?format=csv&gid=1295678534';

export async function fetchAthletesFromSheet(): Promise<AthleteData[]> {
  try {
    const response = await fetch(SHEET_URL);
    const csvText = await response.text();
    
    return new Promise((resolve, reject) => {
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const athletes: AthleteData[] = results.data.map((row: any, i: number) => ({
            id: `ath-${i}-${row['Nama Lengkap']?.replace(/\s+/g, '-').toLowerCase()}`,
            timestamp: row['Timestamp'],
            fullName: row['Nama Lengkap'],
            gender: row['Jenis Kelamin'] || row['Gender'],
            birthDate: row['Tanggal Lahir'],
            school: row['Asal Sekolah'],
            instagram: row['Instagram'],
            whatsappAthlete: row['No WhatsApp'],
            height: row['Tinggi Badan'],
            photoUrl: row['Foto Anggota Club'],
            parentName: row['Nama Lengkap (Bapak/Ibu)'],
            parentJob: row['Pekerjaan'],
            address: row['Alamat'],
            whatsappParent: row['No WhatsApp'] || row['No WhatsApp_1'], // Handle dual headers if any
            email: row['Email Aktif'],
            sessionsPerWeek: row['Jumlah Pertemuan per minggu'],
            trainingSchedule: row['Jadwal Latihan'],
          }));
          resolve(athletes);
        },
        error: (error: any) => {
          reject(error);
        },
      });
    });
  } catch (error) {
    console.error('Error fetching sheet data:', error);
    return [];
  }
}
