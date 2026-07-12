import { NextResponse } from 'next/server';

export async function GET() {
  // In a production environment, this backend route would query your indexer 
  // (like The Graph) or a relational database tracking active intents.
  // For now, we simulate an active backend returning real-time status.
  
  const mockIntents = [
    {
      id: "0x8f4d92a1b3c4e5f67890abcdef12345678903a2b",
      route: "Base → OP",
      amount: "500",
      protection: "Active",
      status: "Routing",
    },
    {
      id: "0x2a9c1f8e7d6c5b4a39201fdecba0987654329c1f",
      route: "Arb → OP",
      amount: "1200",
      protection: "Active",
      status: "Expired",
    },
    {
      id: "0x1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c",
      route: "Eth → Base",
      amount: "2500",
      protection: "Inactive",
      status: "Settled",
    }
  ];

  return NextResponse.json(mockIntents);
}
