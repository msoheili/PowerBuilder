import { NextRequest, NextResponse } from "next/server";

const CUSTOM_THEMES_KEY = "custom_themes";

// Simple server-side storage (in production, you'd use a database)
let themesStorage: any[] = [];

export async function GET() {
  try {
    return NextResponse.json({ themes: themesStorage });
  } catch (error) {
    console.error('Error fetching custom themes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch custom themes' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { theme } = body;

    if (!theme || !theme.id || !theme.name) {
      return NextResponse.json(
        { error: 'Invalid theme data' },
        { status: 400 }
      );
    }

    const existingThemes = themesStorage.filter((t: any) => t.id !== theme.id);
    existingThemes.push(theme);
    themesStorage = existingThemes;

    return NextResponse.json({ 
      success: true,
      theme 
    });
  } catch (error) {
    console.error('Error saving custom theme:', error);
    return NextResponse.json(
      { error: 'Failed to save custom theme' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const themeId = searchParams.get("id");

    if (!themeId) {
      return NextResponse.json(
        { error: 'Theme ID is required' },
        { status: 400 }
      );
    }

    themesStorage = themesStorage.filter((t: any) => t.id !== themeId);

    return NextResponse.json({ 
      success: true,
      message: 'Theme deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting custom theme:', error);
    return NextResponse.json(
      { error: 'Failed to delete custom theme' },
      { status: 500 }
    );
  }
} 