@echo off
chcp 65001 > nul
title Sincronizar Cambios con GitHub y Vercel
echo ================================================================
echo   TOOLMASTER PRO - SINCRONIZADOR CON GITHUB Y VERCEL
echo ================================================================
echo.
echo 1. Comprobando estado del repositorio...
git status
echo.
echo 2. Subiendo commits pendientes a https://github.com/anuardavid87-stack/Tools.git ...
echo (Si es la primera vez, se abrirá una ventana para autorizar con GitHub)
echo.
git push -u origin main

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ================================================================
    echo   ✅ ¡TODO LISTO! Los cambios ya están en GitHub.
    echo   🚀 Vercel detectará el push y actualizará tu página en 1 minuto.
    echo ================================================================
) else (
    echo.
    echo ================================================================
    echo   ⚠️ No se pudo completar la sincronización automática.
    echo   Verifica tu usuario/contraseña o Personal Access Token de GitHub.
    echo ================================================================
)

echo.
pause
