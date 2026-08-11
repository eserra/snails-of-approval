"use client";

import { useEffect, useState } from "react";

export type Chapter = {
  id: number;
  name: string;
  centroid?: { lat: number; lon: number } | null;
};
export type Category = {
  id: number;
  name: string;
  parentId: number | null;
  children?: { id: number; name: string }[];
};
export type UserOption = { id: number; name: string };

/**
 * The reference data the snail create form and detail page both need:
 * chapters (with centroids that bias the address search), categories, and
 * assignable users.
 */
export function useSnailFormData() {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/chapters"),
      fetch("/api/admin/categories"),
      fetch("/api/admin/users/list"),
    ]).then(async ([chRes, catRes, usersRes]) => {
      setChapters(await chRes.json());
      setCategories(await catRes.json());
      if (usersRes.ok) setUsers(await usersRes.json());
    });
  }, []);

  return { chapters, categories, users };
}
