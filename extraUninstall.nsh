!macro customUnInstall
  ; Kullanici verilerini tamamen temizle
  RMDir /r "$APPDATA\arsiv-yonetim-sistemi"
  
  ; Kurulum dizinindeki tum dosyalari sil
  RMDir /r "$INSTDIR\backend\PDFs"
  RMDir /r "$INSTDIR\backend\Backups"
  RMDir /r "$INSTDIR\backend\tmp"
  Delete "$INSTDIR\backend\*.db"
  Delete "$INSTDIR\backend\*.db-shm"
  Delete "$INSTDIR\backend\*.db-wal"
  Delete "$INSTDIR\backend\*.log"
  Delete "$INSTDIR\*.log"
  Delete "$INSTDIR\*.db"
  
  ; Desktop kisayolunu sil
  Delete "$DESKTOP\Arsiv Yonetim Sistemi.lnk"
  
  ; Baslat menusu kisayollarini sil
  Delete "$STARTMENU\Arsiv Yonetim Sistemi.lnk"
  Delete "$SMPROGRAMS\Arsiv Yonetim Sistemi\*.lnk"
  RMDir "$SMPROGRAMS\Arsiv Yonetim Sistemi"
  
  ; Registry kayitlarini temizle
  DeleteRegKey HKCU "Software\arsiv-yonetim-sistemi"
  DeleteRegKey HKLM "Software\arsiv-yonetim-sistemi"
!macroend
