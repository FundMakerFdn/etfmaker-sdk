"use client";

import { getIndexCategoriesDistributionData } from "app/data/getIndexCategoriesDistributionData";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "app/shadcn/components/ui/table";
import { useState, useEffect, FC } from "react";

export const IndexCategoriesDistribution: FC<{ etfId: string }> = ({
  etfId,
}) => {
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const data = await getIndexCategoriesDistributionData(etfId);
      setData(data);
    };
    fetchData();
  }, [etfId]);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Category</TableHead>
          <TableHead>% of market value</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((rowData) => (
          <TableRow key={rowData.category}>
            <TableCell className="border-2">{rowData.category}</TableCell>
            <TableCell className="border-2">{rowData.percentage}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
