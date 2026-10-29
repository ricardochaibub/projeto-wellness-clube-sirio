# Servidor estatico minimo para o preview local.
#
# Este projeto e um site estatico. O PowerShell 5.1 ja vem com o .NET
# Framework, entao o HttpListener serve o site sem instalar nada (e o que o
# abrir-site.bat usa). Pastas como /3d/ entregam o index.html delas.
#
# Uso: powershell -NoProfile -ExecutionPolicy Bypass -File .claude/serve.ps1 -Port 8770

param(
    [int]$Port = 8765,
    [string]$Root
)

$ErrorActionPreference = 'Stop'

if (-not $Root) { $Root = Split-Path -Parent $PSScriptRoot }
$Root = (Resolve-Path $Root).Path

$mime = @{
    '.html' = 'text/html; charset=utf-8'
    '.htm'  = 'text/html; charset=utf-8'
    '.css'  = 'text/css; charset=utf-8'
    '.js'   = 'text/javascript; charset=utf-8'
    '.json' = 'application/json; charset=utf-8'
    '.svg'  = 'image/svg+xml'
    '.jpg'  = 'image/jpeg'
    '.jpeg' = 'image/jpeg'
    '.png'  = 'image/png'
    '.gif'  = 'image/gif'
    '.webp' = 'image/webp'
    '.avif' = 'image/avif'
    '.ico'  = 'image/x-icon'
    '.woff' = 'font/woff'
    '.woff2'= 'font/woff2'
    '.txt'  = 'text/plain; charset=utf-8'
    '.md'   = 'text/markdown; charset=utf-8'
    '.xlsx' = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
}

$listener = New-Object System.Net.HttpListener
# "localhost" (e nao "+") permite escutar sem privilegio de administrador.
$listener.Prefixes.Add("http://localhost:$Port/")

try {
    $listener.Start()
} catch {
    Write-Output "ERRO: nao foi possivel escutar na porta $Port -- $($_.Exception.Message)"
    exit 1
}

Write-Output "Servindo $Root em http://localhost:$Port/"

try {
    while ($listener.IsListening) {
        $ctx = $listener.GetContext()
        $req = $ctx.Request
        $res = $ctx.Response

        try {
            # Descarta query string e decodifica %20 etc.
            $rel = [System.Uri]::UnescapeDataString($req.Url.AbsolutePath)
            if ($rel -eq '/' -or $rel -eq '') { $rel = '/index.html' }
            $rel = $rel.TrimStart('/').Replace('/', '\')

            $full = Join-Path $Root $rel
            if (Test-Path -LiteralPath $full -PathType Container) {
                $full = Join-Path $full 'index.html'
            }

            # Impede sair da pasta do projeto (path traversal).
            $fullResolved = $null
            if (Test-Path -LiteralPath $full -PathType Leaf) {
                $fullResolved = (Resolve-Path -LiteralPath $full).Path
            }

            if ($fullResolved -and $fullResolved.StartsWith($Root, [System.StringComparison]::OrdinalIgnoreCase)) {
                $ext = [System.IO.Path]::GetExtension($fullResolved).ToLowerInvariant()
                $type = $mime[$ext]
                if (-not $type) { $type = 'application/octet-stream' }

                $bytes = [System.IO.File]::ReadAllBytes($fullResolved)
                $res.StatusCode = 200
                $res.ContentType = $type
                $res.ContentLength64 = $bytes.Length
                # Sem cache: o preview sempre pega a versao recem-editada.
                $res.Headers.Add('Cache-Control', 'no-store, must-revalidate')
                $res.OutputStream.Write($bytes, 0, $bytes.Length)
                Write-Output "200 $rel"
            } else {
                $msg = [System.Text.Encoding]::UTF8.GetBytes("404 - nao encontrado: $rel")
                $res.StatusCode = 404
                $res.ContentType = 'text/plain; charset=utf-8'
                $res.ContentLength64 = $msg.Length
                $res.OutputStream.Write($msg, 0, $msg.Length)
                Write-Output "404 $rel"
            }
        } catch {
            Write-Output "500 $($_.Exception.Message)"
            try { $res.StatusCode = 500 } catch { }
        } finally {
            try { $res.OutputStream.Close() } catch { }
        }
    }
} finally {
    try { $listener.Stop(); $listener.Close() } catch { }
}
