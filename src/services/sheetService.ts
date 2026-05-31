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
          const athletes: AthleteData[] = results.data.map((row: any, i: number) => {
            const rawName = row['Nama Lengkap']?.trim() || '';
            const cleanId = rawName.replace(/\s+/g, '-').toLowerCase();
            return {
              id: `ath-${i}-${cleanId}`,
              timestamp: row['Timestamp']?.trim() || '',
              fullName: rawName,
              gender: row['Jenis Kelamin']?.trim() || row['Gender']?.trim() || '',
              birthDate: row['Tanggal Lahir']?.trim() || '',
              school: row['Asal Sekolah']?.trim() || '',
              instagram: row['Instagram']?.trim() || '',
              whatsappAthlete: row['No WhatsApp']?.trim() || '',
              height: row['Tinggi Badan']?.trim() || '',
              photoUrl: row['Foto Anggota Club']?.trim() || '',
              parentName: row['Nama Lengkap (Bapak/Ibu)']?.trim() || '',
              parentJob: row['Pekerjaan']?.trim() || '',
              address: row['Alamat']?.trim() || '',
              whatsappParent: row['No WhatsApp']?.trim() || row['No WhatsApp_1']?.trim() || '',
              email: row['Email Aktif']?.trim() || '',
              sessionsPerWeek: row['Jumlah Pertemuan per minggu']?.trim() || '',
              trainingSchedule: row['Jadwal Latihan']?.trim() || '',
            };
          });
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
