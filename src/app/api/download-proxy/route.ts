import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fileUrl = searchParams.get('url');

  if (!fileUrl) {
    return new NextResponse('URL parameter is missing', { status: 400 });
  }

  try {
    const response = await fetch(fileUrl);

    if (!response.ok) {
      return new NextResponse('Failed to fetch the file', { status: response.status });
    }
    
    const headers = new Headers(response.headers);
    headers.set('Content-Disposition', 'attachment');

    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: headers,
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
