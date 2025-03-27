"use client";

import { getIndexTableListData } from "app/data/getIndexTableData";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "app/shadcn/components/ui/table";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export const IndexListTable = () => {
  const [data, setData] = useState([]);

  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      const data = await getIndexTableListData();
      setData(data);
    };
    fetchData();
  }, []);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Index name</TableHead>
          <TableHead>Incept. date</TableHead>
          <TableHead>As of</TableHead>
          <TableHead>Perf. as of</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((rowData) => (
          <TableRow
            onClick={() => router.push(`/indexes/${rowData.etfId}`)}
            key={rowData.etfId}
            className="hover:bg-gray-100 cursor-pointer"
          >
            <TableCell>{rowData.etfId}</TableCell>
            <TableCell>{rowData.inceptDate}</TableCell>
            <TableCell>{rowData.lastRebalanceDate}</TableCell>
            <TableCell>{rowData.lastEtfPriceDate}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
