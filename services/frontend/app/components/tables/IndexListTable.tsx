import { getIndexTableListData } from "app/data/getIndexTableData";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "app/shadcn/components/ui/table";
import { useState, useEffect } from "react";

export const IndexListTable = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const data = await getIndexTableListData();
      setData(data);
    };
    fetchData();
  }, []);

  return (
    <Table>
      <TableCaption>A list of available indexes.</TableCaption>
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
          <TableRow key={rowData.etfId}>
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
