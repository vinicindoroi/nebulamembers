import server from '../dist/server/server.js';

export async function GET(request) {
  return server.fetch(request);
}

export async function POST(request) {
  return server.fetch(request);
}

export async function PUT(request) {
  return server.fetch(request);
}

export async function PATCH(request) {
  return server.fetch(request);
}

export async function DELETE(request) {
  return server.fetch(request);
}

export async function OPTIONS(request) {
  return server.fetch(request);
}

export async function HEAD(request) {
  return server.fetch(request);
}
